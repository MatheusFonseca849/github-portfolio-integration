import RepoMetadata from "./interfaces/IrepoMetadata.js";
import GetReposOptions from "./interfaces/IgetReposOptions.js";
/**
 * Fetch all repositories of a user and read their portfolio metadata from repo.config.json files
 *
 * @param username - GitHub username (required, must be a valid GitHub username)
 * @param options - Configuration options or token string for backward compatibility
 * @returns Promise that resolves to an array of RepoMetadata objects for published repositories
 * @throws Error if username is invalid or GitHub API is unreachable
 */
export declare function getRepos(username: string, options?: string | GetReposOptions): Promise<RepoMetadata[]>;
//# sourceMappingURL=index.d.ts.map