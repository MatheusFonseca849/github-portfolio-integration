import fetchWithRateLimit from "./helpers/fetchWithRateLimit";
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
export async function getRepos(username, token) {
    // Input validation
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        throw new Error('Username is required and must be a non-empty string');
    }
    // Validate GitHub username format
    if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username.trim())) {
        throw new Error('Invalid GitHub username format');
    }
    const cleanUsername = username.trim();
    const headers = {
        Accept: "application/vnd.github.v3+json",
    };
    if (token)
        headers.Authorization = `token ${token}`;
    const reposRes = await fetchWithRateLimit(`https://api.github.com/users/${cleanUsername}/repos`, { headers });
    const repos = await reposRes.json();
    const portfolioRepos = [];
    for (const repo of repos) {
        try {
            const configRes = await fetchWithRateLimit(`https://api.github.com/repos/${cleanUsername}/${repo.name}/contents/src/repo.config.json`, { headers });
            if (!configRes.ok)
                continue;
            const configData = await configRes.json();
            // GitHub API returns base64-encoded content, so we need to decode it
            const contentBase64 = configData.content.replace(/\n/g, "");
            const contentString = Buffer.from(contentBase64, "base64").toString("utf-8");
            const repoConfig = JSON.parse(contentString);
            if (repoConfig.published) {
                const thumbnaillUrl = `https://raw.githubusercontent.com/${cleanUsername}/${repo.name}/${repoConfig.branch || "main"}/${repoConfig.thumbnail}`;
                portfolioRepos.push({
                    name: repo.name,
                    url: repo.html_url,
                    thumbnail: thumbnaillUrl || "./assets/default.png",
                    info: repoConfig.info || "",
                    title: repoConfig.title || "",
                    customConfig: repoConfig.customConfig,
                });
            }
        }
        catch (err) {
            console.warn(`Skipping repo ${repo.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            continue;
        }
    }
    return portfolioRepos;
}
//# sourceMappingURL=index.js.map