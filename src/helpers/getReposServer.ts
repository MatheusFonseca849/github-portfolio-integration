import GetReposOptions from "../interfaces/IgetReposOptions.js";
import RepoMetadata from "../interfaces/IrepoMetadata.js";
import processReposParallel from "./processReposParallel.js";
import processReposSequential from "./processReposSequential.js";

// Server-specific imports (Node.js only)
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Server-side cache implementation
 */
class ServerCache {
  private cachePath: string;

  constructor(cachePath: string = './.cache/portfolio') {
    this.cachePath = cachePath;
  }

  async get(key: string, maxAge: number): Promise<RepoMetadata[] | null> {
    if (maxAge <= 0) return null;
    
    try {
      const filePath = path.join(this.cachePath, `${key}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const { data: repos, timestamp } = JSON.parse(data);
      
      if (Date.now() - timestamp > maxAge) {
        await fs.unlink(filePath).catch(() => {}); // Clean up expired cache
        return null;
      }
      
      return repos;
    } catch {
      return null;
    }
  }

  async set(key: string, data: RepoMetadata[]): Promise<void> {
    try {
      await fs.mkdir(this.cachePath, { recursive: true });
      const filePath = path.join(this.cachePath, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Failed to cache data:', err);
    }
  }
}

export async function getReposServer(
  username: string,
  options?: string | GetReposOptions
): Promise<RepoMetadata[]> {
  // Input validation (same as browser)
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    throw new Error('Username is required and must be a non-empty string');
  }

  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username.trim())) {
    throw new Error('Invalid GitHub username format');
  }

  const cleanUsername = username.trim();
  const config: GetReposOptions = typeof options === 'string'
    ? { token: options }
    : {
      maxRepos: 100,
      parallel: true,
      cacheMs: 20 * 60 * 1000,
      debug: false,
      ...options
    };

  // Server-side caching
  const cache = new ServerCache(config.serverOptions?.cachePath);
  const cacheKey = `portfolio-${cleanUsername}-${config.token ? 'auth' : 'public'}`;
  
  const cached = await cache.get(cacheKey, config.cacheMs || 0);
  if (cached) {
    config.debug && console.log('📦 Serving from server cache');
    return cached;
  }

  // Use Node.js fetch (available in Node 18+)
  const headers: { [key: string]: string } = {
    Accept: "application/vnd.github.v3+json",
    'User-Agent': 'portfolio-github-integration-server'
  };
  if (config.token) headers.Authorization = `token ${config.token}`;

  // Server-side rate limiting could be more sophisticated here
  const reposRes = await fetch(
    `https://api.github.com/users/${cleanUsername}/repos?per_page=${config.maxRepos || 100}&sort=updated`,
    { headers }
  );

  if (!reposRes.ok) {
    throw new Error(`GitHub API error: ${reposRes.status} ${reposRes.statusText}`);
  }

  const allRepos = await reposRes.json() as any[];
  const repos = allRepos
    .filter(repo => !repo.fork && !repo.archived)
    .slice(0, config.maxRepos || 100);

  config.debug && console.log(`🔍 [Server] Scanning ${repos.length} repositories...`);

  let portfolioRepos: RepoMetadata[];

  if (config.parallel) {
    portfolioRepos = await processReposParallel(repos, cleanUsername, headers, config);
  } else {
    portfolioRepos = await processReposSequential(repos, cleanUsername, headers, config);
  }

  // Cache results
  await cache.set(cacheKey, portfolioRepos);

  config.debug && console.log(`✅ [Server] Found ${portfolioRepos.length} published repositories`);
  return portfolioRepos;
}