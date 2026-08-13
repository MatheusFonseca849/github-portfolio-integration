import RepoMetadata from "./RepoMetadata.js";

/** Built-in sort presets or a custom comparator function */
export type SortByPreset = 'updated' | 'order' | 'title' | 'name';
export type SortByComparator = (a: RepoMetadata, b: RepoMetadata) => number;
export type SortBy = SortByPreset | SortByComparator;

interface GetReposOptions {
    /** GitHub Personal Access Token for private repositories */
    token?: string;
    /** Maximum number of repositories to process (default: 100) */
    maxRepos?: number;
    /** Enable parallel processing (default: true) */
    parallel?: boolean;
    /** Progress callback function */
    onProgress?: (processed: number, total: number, repoName: string) => void;
    /** Cache results for this many milliseconds (default: 60 minutes) */
    cacheMs?: number;
    /** Enable debug mode (default: false) */
    debug?: boolean;
    /** Maximum number of API requests per getRepos() call (default: 55 unauthenticated, 500 authenticated) */
    requestBudget?: number;
    /** Sort order for results (default: 'updated') */
    sortBy?: SortBy;
  }

  export default GetReposOptions