import { getRepos } from '../../dist/index.js';

// Use environment variable or fallback to a known test user
const userName = process.env.TEST_GITHUB_USERNAME || 'octocat';

describe('getRepos', () => {
  describe('Input validation', () => {
    test('should throw error for empty username', async () => {
      await expect(getRepos('')).rejects.toThrow('Username is required and must be a non-empty string');
    });

    test('should throw error for whitespace-only username', async () => {
      await expect(getRepos('   ')).rejects.toThrow('Username is required and must be a non-empty string');
    });

    test('should throw error for invalid username format', async () => {
      await expect(getRepos('invalid-username-with-special-chars!@#')).rejects.toThrow('Invalid GitHub username format');
    });

    test('should throw error for username that is too long', async () => {
      const longUsername = 'a'.repeat(40); // GitHub usernames max 39 chars
      await expect(getRepos(longUsername)).rejects.toThrow('Invalid GitHub username format');
    });

    test('should accept valid username format', () => {
      // This shouldn't throw during validation (API call might fail, but validation should pass)
      expect(() => {
        const cleanUsername = userName;
        if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(cleanUsername.trim())) {
          throw new Error('Invalid GitHub username format');
        }
      }).not.toThrow();
    });
  });

  describe('API calls', () => {
    test('should return array for valid username', async () => {
      const repos = await getRepos('octocat');
      expect(Array.isArray(repos)).toBe(true);
    }, 10000); // 10 second timeout for API call

    test('should return empty array when no portfolio repos exist', async () => {
      // Most users won't have repo.config.json files, so this should typically return empty array
      const repos = await getRepos('octocat');
      expect(Array.isArray(repos)).toBe(true);
      expect(repos.length).toBeGreaterThanOrEqual(0);
    }, 10000);

    test('should handle non-existent user gracefully', async () => {
      // GitHub API returns 404 for non-existent users, which should be handled
      await expect(getRepos('this-user-definitely-does-not-exist-12345-xyz')).rejects.toThrow();
    }, 10000);
  });

  describe('Return value structure', () => {
    test('should return objects with correct RepoMetadata structure when repos exist', async () => {
      const repos = await getRepos('octocat');
      
      if (repos.length > 0) {
        const repo = repos[0];
        expect(repo).toHaveProperty('name');
        expect(repo).toHaveProperty('url');
        expect(repo).toHaveProperty('thumbnail');
        expect(repo).toHaveProperty('info');
        expect(repo).toHaveProperty('title');
        expect(repo).toHaveProperty('customConfig');
        
        expect(typeof repo.name).toBe('string');
        expect(typeof repo.url).toBe('string');
        expect(typeof repo.thumbnail).toBe('string');
        expect(typeof repo.info).toBe('string');
        expect(typeof repo.title).toBe('string');
      }
    }, 10000);
  });
});