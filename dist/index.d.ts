import RepoMetadata from "./interfaces/IrepoMetadata.js";
/**
 * Configuration options for getRepos function
 */
interface GetReposOptions {
    /** GitHub Personal Access Token for private repositories */
    token?: string;
    /** Maximum number of repositories to process (default: 100) */
    maxRepos?: number;
    /** Enable parallel processing (default: true) */
    parallel?: boolean;
    /** Progress callback function */
    onProgress?: (processed: number, total: number, repoName: string) => void;
    /** Cache results for this many milliseconds (default: 5 minutes) */
    cacheMs?: number;
}
/**
 * Fetch all repositories of a user and read their portfolio metadata from repo.config.json files
 *
 * @param username - GitHub username (required, must be a valid GitHub username)
 * @param options - Configuration options or token string for backward compatibility
 * @returns Promise that resolves to an array of RepoMetadata objects for published repositories
 * @throws Error if username is invalid or GitHub API is unreachable
 *
 * @example
 * ```typescript
 * // Basic usage (public repositories only)
 * const repos = await getRepos('octocat');
 *
 * // With token (backward compatible)
 * const repos = await getRepos('octocat', 'ghp_xxxxxxxxxxxx');
 *
 * // With full options
 * const repos = await getRepos('octocat', {
 *   token: 'ghp_xxxxxxxxxxxx',
 *   maxRepos: 50,
 *   parallel: true,
 *   onProgress: (processed, total, repoName) => {
 *     console.log(`Processing ${repoName}: ${processed}/${total}`);
 *   }
 * });
 * ```
 */
export declare function getRepos(username: string, options?: string | GetReposOptions): Promise<RepoMetadata[]>;
export {};
//# sourceMappingURL=index.d.ts.map