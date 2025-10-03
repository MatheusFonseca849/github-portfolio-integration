import GetReposOptions from "./interfaces/IgetReposOptions.js";
import RepoMetadata from "./interfaces/IrepoMetadata.js";
import { getReposBrowser } from "./helpers/getReposBrowser.js";
// import { getReposServer } from "./helpers/getReposServer.js"; // Uncomment when implemented

/**
 * Environment detection
 */
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;

/**
 * Main entry point - routes to appropriate implementation based on environment
 */
export async function getRepos(
  username: string,
  options?: string | GetReposOptions
): Promise<RepoMetadata[]> {
  // Parse options to get environment preference
  const config: GetReposOptions = typeof options === 'string'
    ? { token: options }
    : { environment: 'auto', ...options };

  // Determine environment
  const environment = config.environment === 'auto' 
    ? (isBrowser ? 'browser' : 'server')
    : config.environment || 'browser';

  // Route to appropriate implementation
  if (environment === 'server' && !isBrowser) {
    // TODO: Implement server version
    // return getReposServer(username, config);
    throw new Error('Server implementation not yet available. Use environment: "browser" for now.');
  } else {
    return getReposBrowser(username, config);
  }
}

// Re-export types for convenience
export type { default as GetReposOptions } from "./interfaces/IgetReposOptions.js";
export type { default as RepoMetadata } from "./interfaces/IrepoMetadata.js";