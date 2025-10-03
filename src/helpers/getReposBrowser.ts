
import GetReposOptions from "../interfaces/IgetReposOptions";
import RepoMetadata from "../interfaces/IrepoMetadata";
import fetchWithRateLimit, { PRIORITY } from "./fetchWithRateLimit";
import processReposParallel from "./processReposParallel";
import processReposSequential from "./processReposSequential";
import {getFromCache, cache} from "../helpers/getFromCache";


/**
 * Fetch all repositories of a user and read their portfolio metadata from repo.config.json files
 * 
 * @param username - GitHub username (required, must be a valid GitHub username)
 * @param options - Configuration options or token string for backward compatibility
 * @returns Promise that resolves to an array of RepoMetadata objects for published repositories
 * @throws Error if username is invalid or GitHub API is unreachable
 */
export async function getReposBrowser(
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
    cache.set(cacheKey, { data: portfolioRepos, timestamp: Date.now() });
  
    config.debug && console.log(`✅ Found ${portfolioRepos.length} published repositories`);
    return portfolioRepos;
  }