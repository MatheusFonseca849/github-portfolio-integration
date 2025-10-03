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
}
export default GetReposOptions;
//# sourceMappingURL=IgetReposOptions.d.ts.map