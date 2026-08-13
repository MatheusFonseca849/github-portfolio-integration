// Use native fetch API (available in browsers and Node.js 18+)
import RepoMetadata from "./interfaces/RepoMetadata.js";
import GitHubFileContent from "./interfaces/GitHubFileContent.js";
import fetchWithRateLimit, {
  PRIORITY,
  calculateRepoPriority,
  configureRateLimiter,
  isRateLimiterAborted,
  getRequestCount,
  RateLimitError,
} from "./helpers/fetchWithRateLimit.js";
import GetReposOptions from "./interfaces/GetReposOptions.js";
import type { SortBy } from "./interfaces/GetReposOptions.js";

// Re-export types for consumer use
export type { RepoMetadata, GetReposOptions, SortBy };
import { getFromCache } from "./helpers/getFromCache.js";
import { cache } from "./helpers/getFromCache.js";

const LOG_PREFIX = '[portfolio-github-integration]';

/** Shape of a repository returned by the GitHub API */
interface GitHubRepo {
  name: string;
  html_url: string;
  fork: boolean;
  archived: boolean;
  updated_at?: string;
  default_branch?: string;
}

/** Shape of a tree item from the Git Trees API */
interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

/** Shape of the Git Trees API response */
interface GitTreeResponse {
  sha: string;
  url: string;
  tree: GitTreeItem[];
  truncated: boolean;
}

/** Shape of a parsed repo.config.json */
interface RepoConfig {
  published?: boolean;
  title?: string;
  info?: string;
  publicUrl?: string;
  thumbnail?: string;
  branch?: string;
  order?: number;
  customConfig?: Record<string, unknown>;
}

/**
 * Validate that a parsed config object has the expected shape.
 * Returns the validated config or null if invalid.
 */
function validateRepoConfig(parsed: unknown): RepoConfig | null {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  // `published` must be a boolean if present
  if ('published' in obj && typeof obj.published !== 'boolean') return null;

  // String fields must be strings if present
  const stringFields = ['title', 'info', 'publicUrl', 'thumbnail', 'branch'] as const;
  for (const field of stringFields) {
    if (field in obj && typeof obj[field] !== 'string') return null;
  }

  // `order` must be a positive integer if present; invalid values are stripped (not rejected)
  if ('order' in obj) {
    if (typeof obj.order !== 'number' || !Number.isFinite(obj.order) || obj.order < 1 || !Number.isInteger(obj.order)) {
      delete obj.order;
    }
  }

  // `customConfig` must be a plain object if present
  if ('customConfig' in obj && (typeof obj.customConfig !== 'object' || obj.customConfig === null || Array.isArray(obj.customConfig))) {
    return null;
  }

  return obj as unknown as RepoConfig;
}

/**
 * Store data in cache
 */
function setCache(key: string, data: RepoMetadata[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Sort portfolio repos based on the sortBy option.
 * Default ('updated') preserves the GitHub API order (already sorted by updated_at desc).
 */
function sortRepos(repos: RepoMetadata[], sortBy: SortBy | undefined): RepoMetadata[] {
  if (!sortBy || sortBy === 'updated') {
    return repos;
  }

  if (typeof sortBy === 'function') {
    return [...repos].sort(sortBy);
  }

  switch (sortBy) {
    case 'order':
      return [...repos].sort((a, b) => {
        const aHasOrder = a.order !== undefined;
        const bHasOrder = b.order !== undefined;
        if (aHasOrder && bHasOrder) return a.order! - b.order!;
        if (aHasOrder) return -1;
        if (bHasOrder) return 1;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      });

    case 'title':
      return [...repos].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      );

    case 'name':
      return [...repos].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );

    default:
      return repos;
  }
}

/**
 * Clear cached portfolio data.
 * @param username - If provided, only clears cache for that user. Otherwise clears all.
 */
export function clearCache(username?: string): void {
  if (!username) {
    cache.clear();
    return;
  }
  const prefix = `portfolio-${username.trim()}-`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Fetch all repositories of a user and read their portfolio metadata from repo.config.json files.
 * Uses the Git Trees API to minimize request count.
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
      cacheMs: 60 * 60 * 1000, // 60 minutes
      debug: false,
      ...options
    };

  // Check cache first
  const cacheKey = `portfolio-${cleanUsername}-${config.token ? 'auth' : 'public'}`;
  const cached = getFromCache(cacheKey, config.cacheMs || 0);
  if (cached) {
    config.debug && console.log(`${LOG_PREFIX} Returning cached results (${cached.length} repos)`);
    return sortRepos(cached, config.sortBy);
  }

  // Configure rate limiter for this session
  configureRateLimiter({
    authenticated: !!config.token,
    requestBudget: config.requestBudget,
  });

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (config.token) headers.Authorization = `token ${config.token}`;

  // Fetch repositories with pagination support (highest priority)
  const reposRes = await fetchWithRateLimit(
    `https://api.github.com/users/${cleanUsername}/repos?per_page=${config.maxRepos || 100}&sort=updated`,
    { headers },
    PRIORITY.CRITICAL
  );
  const allRepos = await reposRes.json() as GitHubRepo[];

  // Filter and limit repositories for better performance
  const repos = allRepos
    .filter(repo => !repo.fork && !repo.archived) // Skip forks and archived repos
    .slice(0, config.maxRepos || 100); // Limit number of repos to check

  // Pre-scan warning for unauthenticated users with many repos
  if (!config.token && repos.length > 30) {
    console.warn(
      `${LOG_PREFIX} WARNING: ${repos.length} repositories to scan without a token. ` +
      `Unauthenticated GitHub API limit is 60 requests/hour. Consider providing a token ` +
      `for reliable results. See: https://github.com/MatheusFonseca849/github-portfolio-integration#authentication--token-safety`
    );
  }

  config.debug && console.log(`${LOG_PREFIX} Scanning ${repos.length} repositories for portfolio configs...`);

  let portfolioRepos: RepoMetadata[];

  if (config.parallel) {
    // Parallel processing for maximum speed
    portfolioRepos = await processReposParallel(repos, cleanUsername, headers, config);
  } else {
    // Sequential processing (fallback)
    portfolioRepos = await processReposSequential(repos, cleanUsername, headers, config);
  }

  // If we were rate-limited mid-run, warn about partial results
  if (isRateLimiterAborted() && portfolioRepos.length > 0) {
    console.warn(
      `${LOG_PREFIX} GitHub API rate limit reached. Returning ${portfolioRepos.length} repos processed before the limit was hit.`
    );
  }

  // Cache unsorted results (sorting is applied on every return so different sortBy values don't bust cache)
  setCache(cacheKey, portfolioRepos);

  // Sort results based on sortBy option
  portfolioRepos = sortRepos(portfolioRepos, config.sortBy);

  config.debug && console.log(`${LOG_PREFIX} Found ${portfolioRepos.length} published repositories (${getRequestCount()} API requests used)`);
  return portfolioRepos;
}

/**
 * Process repositories in parallel for maximum performance.
 * Uses Trees API to check for config existence before fetching content.
 */
async function processReposParallel(
  repos: GitHubRepo[],
  username: string,
  headers: Record<string, string>,
  config: GetReposOptions
): Promise<RepoMetadata[]> {
  const results: (RepoMetadata | null)[] = await Promise.all(
    repos.map(async (repo, index) => {
      try {
        // Skip if rate limiter aborted
        if (isRateLimiterAborted()) return null;
        config.onProgress?.(index + 1, repos.length, repo.name);
        return await processSingleRepo(repo, username, headers, config);
      } catch (err) {
        const error = err as RateLimitError;
        // Silently skip rate limit errors (already handled by abort)
        if (error.isRateLimit) return null;
        config.debug && console.warn(`${LOG_PREFIX} Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return null;
      }
    })
  );

  return results.filter((repo): repo is RepoMetadata => repo !== null);
}

/**
 * Process repositories sequentially (fallback method).
 * Uses Trees API to check for config existence before fetching content.
 */
async function processReposSequential(
  repos: GitHubRepo[],
  username: string,
  headers: Record<string, string>,
  config: GetReposOptions
): Promise<RepoMetadata[]> {
  const portfolioRepos: RepoMetadata[] = [];

  for (let i = 0; i < repos.length; i++) {
    // Stop early if rate limiter aborted
    if (isRateLimiterAborted()) break;

    const repo = repos[i];
    try {
      config.onProgress?.(i + 1, repos.length, repo.name);
      const result = await processSingleRepo(repo, username, headers, config);
      if (result) {
        portfolioRepos.push(result);
      }
    } catch (err) {
      const error = err as RateLimitError;
      if (error.isRateLimit) break; // Stop on rate limit
      config.debug && console.warn(`${LOG_PREFIX} Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return portfolioRepos;
}

/**
 * Process a single repository to check for portfolio config.
 * Uses the Git Trees API to check if repo.config.json exists (1 request)
 * before fetching the actual content (1 additional request only if found).
 */
async function processSingleRepo(
  repo: GitHubRepo,
  username: string,
  headers: Record<string, string>,
  config: GetReposOptions
): Promise<RepoMetadata | null> {
  // Calculate priority based on repo freshness
  const priority = calculateRepoPriority(repo);
  const branch = repo.default_branch || 'main';

  // Use Trees API to check if repo.config.json exists (single request)
  let configPath: string | null = null;
  let fromSrc = false;

  try {
    const treeRes = await fetchWithRateLimit(
      `https://api.github.com/repos/${username}/${repo.name}/git/trees/${branch}`,
      { headers },
      priority
    );
    const treeData = await treeRes.json() as GitTreeResponse;

    // Check root for repo.config.json
    const rootConfig = treeData.tree.find(item => item.path === 'repo.config.json' && item.type === 'blob');
    if (rootConfig) {
      configPath = 'repo.config.json';
    } else {
      // Check if src/ directory exists (for deprecated fallback)
      const srcDir = treeData.tree.find(item => item.path === 'src' && item.type === 'tree');
      if (srcDir) {
        // Need to fetch src/ subtree to check for config there
        try {
          const srcTreeRes = await fetchWithRateLimit(
            `https://api.github.com/repos/${username}/${repo.name}/git/trees/${srcDir.sha}`,
            { headers },
            priority
          );
          const srcTreeData = await srcTreeRes.json() as GitTreeResponse;
          const srcConfig = srcTreeData.tree.find(item => item.path === 'repo.config.json' && item.type === 'blob');
          if (srcConfig) {
            configPath = 'src/repo.config.json';
            fromSrc = true;
          }
        } catch {
          // src/ tree fetch failed, skip
        }
      }
    }
  } catch {
    // Trees API failed (empty repo, rate limit, etc.)
    return null;
  }

  // No config file found in this repo
  if (!configPath) return null;

  // Fetch the actual config content (only for repos that have it)
  let configRes: Response;
  try {
    configRes = await fetchWithRateLimit(
      `https://api.github.com/repos/${username}/${repo.name}/contents/${configPath}`,
      { headers },
      priority
    );
  } catch {
    return null;
  }

  const configData = await configRes.json() as GitHubFileContent;

  // GitHub API returns base64-encoded content, so we need to decode it
  const contentBase64 = configData.content.replace(/\n/g, "");
  // Use browser-compatible base64 decoding
  const contentString = typeof Buffer !== 'undefined'
    ? Buffer.from(contentBase64, "base64").toString("utf-8")
    : atob(contentBase64);

  let parsed: unknown;
  try {
    parsed = JSON.parse(contentString);
  } catch {
    return null; // Invalid JSON in config file
  }

  const repoConfig = validateRepoConfig(parsed);
  if (!repoConfig || !repoConfig.published) return null;

  // Emit deprecation warning if config was found in src/
  if (fromSrc) {
    console.warn(
      `${LOG_PREFIX} DEPRECATION WARNING: "${repo.name}" has repo.config.json in src/. ` +
      `Please move it to the project root. The src/ location will stop being supported after November 30, 2026.`
    );
  }

  const results: RepoMetadata = {
    name: repo.name,
    url: repo.html_url,
    publicUrl: repoConfig.publicUrl || "",
    info: repoConfig.info || "",
    title: repoConfig.title || repo.name,
    customConfig: repoConfig.customConfig,
  };

  if (repoConfig.order !== undefined) {
    results.order = repoConfig.order;
  }

  const thumbnailUrl = repoConfig.thumbnail
    ? `https://raw.githubusercontent.com/${username}/${repo.name}/${repoConfig.branch || branch}/${repoConfig.thumbnail}`
    : null;

  if (thumbnailUrl) results.thumbnail = thumbnailUrl;

  return results;
}
