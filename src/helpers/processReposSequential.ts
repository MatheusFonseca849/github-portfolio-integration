
import GetReposOptions from "../interfaces/IgetReposOptions";
import RepoMetadata from "../interfaces/IrepoMetadata";
import processSingleRepo from "./processSingleRepo";

/**
 * Process repositories sequentially (fallback method)
 */
async function processReposSequential(
    repos: any[],
    username: string,
    headers: any,
    config: GetReposOptions
  ): Promise<RepoMetadata[]> {
    const portfolioRepos: RepoMetadata[] = [];
  
    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      try {
        config.onProgress?.(i + 1, repos.length, repo.name);
        const result = await processSingleRepo(repo, username, headers);
        if (result) {
          portfolioRepos.push(result);
        }
      } catch (err) {
       config.debug && console.warn(`⚠️ Skipping ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  
    return portfolioRepos;
  }

  export default processReposSequential;