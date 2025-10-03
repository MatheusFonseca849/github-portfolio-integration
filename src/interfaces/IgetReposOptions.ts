interface GetReposOptions {
  /** GitHub Personal Access Token for private repositories */
  token?: string;
  /** Maximum number of repositories to process (default: 100) */
  maxRepos?: number;
  /** Enable parallel processing (default: true) */
  parallel?: boolean;
  /** Progress callback function */
  onProgress?: (processed: number, total: number, repoName: string) => void;
  /** Cache results for this many milliseconds (default: 20 minutes) */
  cacheMs?: number;
  /** Enable debug mode (default: false) */
  debug?: boolean;
  environment?: 'browser' | 'server' | 'auto'; // auto-detect by default
  serverOptions?: ServerSideOptions;

}

interface ServerSideOptions {
  cacheStrategy?: 'memory' | 'filesystem' | 'redis' | 'database';
  cachePath?: string; // for filesystem caching
  rateLimit?: {
    requestsPerSecond?: number;
    burstLimit?: number;
  };
  preload?: boolean; // for build-time data fetching
}
export default GetReposOptions