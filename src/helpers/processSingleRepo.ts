
import RepoMetadata from "../interfaces/IrepoMetadata";
import { calculateRepoPriority } from "../helpers/fetchWithRateLimit";
import fetchWithRateLimit from "./fetchWithRateLimit";
import GitHubFileContent from "../interfaces/IgithubFileContent";

/**
 * Process a single repository to check for portfolio config
 */
async function processSingleRepo(
    repo: any,
    username: string,
    headers: any
  ): Promise<RepoMetadata | null> {
    // Calculate priority based on repo freshness
    const priority = calculateRepoPriority(repo);
  
    const configRes = await fetchWithRateLimit(
      `https://api.github.com/repos/${username}/${repo.name}/contents/src/repo.config.json`,
      { headers },
      priority
    );
  
    if (!configRes.ok) return null;
  
    const configData = await configRes.json() as GitHubFileContent;
  
    // GitHub API returns base64-encoded content, so we need to decode it
    const contentBase64 = configData.content.replace(/\n/g, "");
    // Use browser-compatible base64 decoding
    const contentString = typeof Buffer !== 'undefined'
      ? Buffer.from(contentBase64, "base64").toString("utf-8")
      : atob(contentBase64);
  
    const repoConfig = JSON.parse(contentString);
  
    if (!repoConfig.published) return null;
  
    let results: RepoMetadata = {
      name: repo.name,
      url: repo.html_url,
      publicUrl: repoConfig.publicUrl || "",
      info: repoConfig.info || "",
      title: repoConfig.title || repo.name,
      customConfig: repoConfig.customConfig,
    };
  
    const thumbnailUrl = repoConfig.thumbnail
      ? `https://raw.githubusercontent.com/${username}/${repo.name}/${repoConfig.branch || "main"}/${repoConfig.thumbnail}`
      : null;
  
    if (thumbnailUrl) results.thumbnail = thumbnailUrl;
  
    return results;
  }

  export default processSingleRepo;