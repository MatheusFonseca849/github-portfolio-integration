// Use native fetch API (available in browsers and Node.js 18+)
import RepoMetadata from "./interfaces/IrepoMetadata.js";
import GitHubFileContent from "./interfaces/IgithubFileContent.js";
import fetchWithRateLimit, { PRIORITY, calculateRepoPriority } from "./helpers/fetchWithRateLimit.js";
import GetReposOptions from "./interfaces/IgetReposOptions.js";
import { getFromCache } from "./helpers/getFromCache.js";
import { cache } from "./helpers/getFromCache.js";

/**
 * Store data in cache
 */
function setCache(key: string, data: RepoMetadata[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}


/**
 * Fetch all repositories of a user and read their portfolio metadata from repo.config.json files
 * 
 * @param username - GitHub username (required, must be a valid GitHub username)
 * @param options - Configuration options or token string for backward compatibility
 * @returns Promise that resolves to an array of RepoMetadata objects for published repositories
 * @throws Error if username is invalid or GitHub API is unreachable
 */
export async function getRepos(
  username: string,
  options?: string | GetReposOptions
): Promise<RepoMetadata[]> {
  // Input validation
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    throw new Error('Username is required and must be a non-empty string');
  }

  // Validate GitHub username format
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username.trim())) {
    throw new Error('Invalid GitHub username format');
  }

  const cleanUsername = username.trim();

  // Handle backward compatibility and parse options
  const config: GetReposOptions = typeof options === 'string'
    ? { token: options }
    : {
      maxRepos: 100,
      parallel: true,
      cacheMs: 20 * 60 * 1000, // 20 minutes
      debug: false,
      ...options
    };

  // Check cache first
  const cacheKey = `portfolio-${cleanUsername}-${config.token ? 'auth' : 'public'}`;
  const cached = getFromCache(cacheKey, config.cacheMs || 0);
  if (cached) {
    return cached;
  }

  const headers: { [key: string]: string } = {
    Accept: "application/vnd.github.v3+json",
  };
  if (config.token) headers.Authorization = `token ${config.token}`;

  // Fetch repositories with pagination support (highest priority)
  const reposRes = await fetchWithRateLimit(
    `https://api.github.com/users/${cleanUsername}/repos?per_page=${config.maxRepos || 100}&sort=updated`,
    { headers },
    PRIORITY.CRITICAL
  );
  const allRepos = await reposRes.json() as any[];

  // Filter and limit repositories for better performance
  const repos = allRepos
    .filter(repo => !repo.fork && !repo.archived) // Skip forks and archived repos
    .slice(0, config.maxRepos || 100); // Limit number of repos to check

  config.debug && console.log(`🔍 Scanning ${repos.length} repositories for portfolio configs...`);

  let portfolioRepos: RepoMetadata[];

  if (config.parallel) {
    // Parallel processing for maximum speed
    portfolioRepos = await processReposParallel(repos, cleanUsername, headers, config);
  } else {
    // Sequential processing (fallback)
    portfolioRepos = await processReposSequential(repos, cleanUsername, headers, config);
  }

  // Cache the results
  setCache(cacheKey, portfolioRepos);

  config.debug && console.log(`✅ Found ${portfolioRepos.length} published repositories`);
  return portfolioRepos;
}

/**
 * Process repositories in parallel for maximum performance
 */
async function processReposParallel(
  repos: any[],
  username: string,
  headers: any,
  config: GetReposOptions
): Promise<RepoMetadata[]> {
  const results: (RepoMetadata | null)[] = await Promise.all(
    repos.map(async (repo, index) => {
      try {
        config.onProgress?.(index + 1, repos.length, repo.name);
        return await processSingleRepo(repo, username, headers);
      } catch (err) {
        config.debug && console.warn(`⚠️ Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return null;
      }
    })
  );

  return results.filter((repo): repo is RepoMetadata => repo !== null);
}

/**
 * Process repositories sequentially (fallback method)
 */
async function processReposSequential(
  repos: any[],
  username: string,
  headers: any,
  config: GetReposOptions
): Promise<RepoMetadata[]> {
  const portfolioRepos: RepoMetadata[] = [];

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    try {
      config.onProgress?.(i + 1, repos.length, repo.name);
      const result = await processSingleRepo(repo, username, headers);
      if (result) {
        portfolioRepos.push(result);
      }
    } catch (err) {
     config.debug && console.warn(`⚠️ Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return portfolioRepos;
}

/**
 * Process a single repository to check for portfolio config
 */
async function processSingleRepo(
  repo: any,
  username: string,
  headers: any
): Promise<RepoMetadata | null> {
  // Calculate priority based on repo freshness
  const priority = calculateRepoPriority(repo);

  const configRes = await fetchWithRateLimit(
    `https://api.github.com/repos/${username}/${repo.name}/contents/src/repo.config.json`,
    { headers },
    priority
  );

  if (!configRes.ok) return null;

  const configData = await configRes.json() as GitHubFileContent;

  // GitHub API returns base64-encoded content, so we need to decode it
  const contentBase64 = configData.content.replace(/\n/g, "");
  // Use browser-compatible base64 decoding
  const contentString = typeof Buffer !== 'undefined'
    ? Buffer.from(contentBase64, "base64").toString("utf-8")
    : atob(contentBase64);

  const repoConfig = JSON.parse(contentString);

  if (!repoConfig.published) return null;

  let results: RepoMetadata = {
    name: repo.name,
    url: repo.html_url,
    publicUrl: repoConfig.publicUrl || "",
    info: repoConfig.info || "",
    title: repoConfig.title || repo.name,
    customConfig: repoConfig.customConfig,
  };

  const thumbnailUrl = repoConfig.thumbnail
    ? `https://raw.githubusercontent.com/${username}/${repo.name}/${repoConfig.branch || "main"}/${repoConfig.thumbnail}`
    : null;

  if (thumbnailUrl) results.thumbnail = thumbnailUrl;

  return results;
}
