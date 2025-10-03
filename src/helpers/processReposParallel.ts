
import GetReposOptions from "../interfaces/IgetReposOptions";
import RepoMetadata from "../interfaces/IrepoMetadata";
import processSingleRepo from "./processSingleRepo";

/**
 * Process repositories in parallel for maximum performance
 */
async function processReposParallel(
    repos: any[],
    username: string,
    headers: any,
    config: GetReposOptions
  ): Promise<RepoMetadata[]> {
    const results: (RepoMetadata | null)[] = await Promise.all(
      repos.map(async (repo, index) => {
        try {
          config.onProgress?.(index + 1, repos.length, repo.name);
          return await processSingleRepo(repo, username, headers);
        } catch (err) {
          config.debug && console.warn(`⚠️ Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          return null;
        }
      })
    );
  
    return results.filter((repo): repo is RepoMetadata => repo !== null);
  }

  export default processReposParallel;