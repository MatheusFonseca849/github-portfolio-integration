import RepoMetadata from "./interfaces/IrepoMetadata";
/**
 * Fetch all repositories of a user and read their portfolio metadata from repo.config.json files
 *
 * @param username - GitHub username (required, must be a valid GitHub username)
 * @param token - GitHub Personal Access Token (optional, enables access to private repositories)
 * @returns Promise that resolves to an array of RepoMetadata objects for published repositories
 * @throws Error if username is invalid or GitHub API is unreachable
 *
 * @example
 * ```typescript
 * // Public repositories only
 * const repos = await getRepos('octocat');
 *
 * // Include private repositories
 * const repos = await getRepos('octocat', 'ghp_xxxxxxxxxxxx');
 * ```
 */
export declare function getRepos(username: string, token?: string): Promise<RepoMetadata[]>;
//# sourceMappingURL=index.d.ts.map