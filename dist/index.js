import fetchWithRateLimit, { PRIORITY, calculateRepoPriority } from "./helpers/fetchWithRateLimit.js";
import { getFromCache } from "./helpers/getFromCache.js";
import { cache } from "./helpers/getFromCache.js";
/**
 * Store data in cache
 */
function setCache(key, data) {
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
export async function getRepos(username, options) {
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
    const config = typeof options === 'string'
        ? { token: options }
        : {
            maxRepos: 100,
            parallel: true,
            cacheMs: 20 * 60 * 1000, // 20 minutes
            ...options
        };
    // Check cache first
    const cacheKey = `portfolio-${cleanUsername}-${config.token ? 'auth' : 'public'}`;
    const cached = getFromCache(cacheKey, config.cacheMs || 0);
    if (cached) {
        return cached;
    }
    const headers = {
        Accept: "application/vnd.github.v3+json",
    };
    if (config.token)
        headers.Authorization = `token ${config.token}`;
    // Fetch repositories with pagination support (highest priority)
    const reposRes = await fetchWithRateLimit(`https://api.github.com/users/${cleanUsername}/repos?per_page=100&sort=updated`, { headers }, PRIORITY.CRITICAL);
    const allRepos = await reposRes.json();
    // Filter and limit repositories for better performance
    const repos = allRepos
        .filter(repo => !repo.fork && !repo.archived) // Skip forks and archived repos
        .slice(0, config.maxRepos || 100); // Limit number of repos to check
    console.log(`🔍 Scanning ${repos.length} repositories for portfolio configs...`);
    let portfolioRepos;
    if (config.parallel) {
        // Parallel processing for maximum speed
        portfolioRepos = await processReposParallel(repos, cleanUsername, headers, config);
    }
    else {
        // Sequential processing (fallback)
        portfolioRepos = await processReposSequential(repos, cleanUsername, headers, config);
    }
    // Cache the results
    setCache(cacheKey, portfolioRepos);
    console.log(`✅ Found ${portfolioRepos.length} published repositories`);
    return portfolioRepos;
}
/**
 * Process repositories in parallel for maximum performance
 */
async function processReposParallel(repos, username, headers, config) {
    const results = await Promise.all(repos.map(async (repo, index) => {
        try {
            config.onProgress?.(index + 1, repos.length, repo.name);
            return await processSingleRepo(repo, username, headers);
        }
        catch (err) {
            console.warn(`⚠️ Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return null;
        }
    }));
    return results.filter((repo) => repo !== null);
}
/**
 * Process repositories sequentially (fallback method)
 */
async function processReposSequential(repos, username, headers, config) {
    const portfolioRepos = [];
    for (let i = 0; i < repos.length; i++) {
        const repo = repos[i];
        try {
            config.onProgress?.(i + 1, repos.length, repo.name);
            const result = await processSingleRepo(repo, username, headers);
            if (result) {
                portfolioRepos.push(result);
            }
        }
        catch (err) {
            console.warn(`⚠️ Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }
    return portfolioRepos;
}
/**
 * Process a single repository to check for portfolio config
 */
async function processSingleRepo(repo, username, headers) {
    // Calculate priority based on repo freshness
    const priority = calculateRepoPriority(repo);
    const configRes = await fetchWithRateLimit(`https://api.github.com/repos/${username}/${repo.name}/contents/src/repo.config.json`, { headers }, priority);
    if (!configRes.ok)
        return null;
    const configData = await configRes.json();
    // GitHub API returns base64-encoded content, so we need to decode it
    const contentBase64 = configData.content.replace(/\n/g, "");
    // Use browser-compatible base64 decoding
    const contentString = typeof Buffer !== 'undefined'
        ? Buffer.from(contentBase64, "base64").toString("utf-8")
        : atob(contentBase64);
    const repoConfig = JSON.parse(contentString);
    if (!repoConfig.published)
        return null;
    const thumbnailUrl = repoConfig.thumbnail
        ? `https://raw.githubusercontent.com/${username}/${repo.name}/${repoConfig.branch || "main"}/${repoConfig.thumbnail}`
        : "./assets/default.png";
    return {
        name: repo.name,
        url: repo.html_url,
        publicUrl: repoConfig.publicUrl || "",
        thumbnail: thumbnailUrl,
        info: repoConfig.info || "",
        title: repoConfig.title || repo.name,
        customConfig: repoConfig.customConfig,
    };
}
//# sourceMappingURL=index.js.map