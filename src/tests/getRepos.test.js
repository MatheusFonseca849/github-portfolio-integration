import { jest } from '@jest/globals';
import { getRepos, clearCache } from '../../dist/index.js';

// --- Mock Helpers ---

/** Encode a string to base64 (Node-compatible) */
function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

/** Build a minimal GitHub repo object */
function makeRepo(name, { fork = false, archived = false, daysOld = 10, default_branch = 'main' } = {}) {
  return {
    name,
    html_url: `https://github.com/testuser/${name}`,
    fork,
    archived,
    default_branch,
    updated_at: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Build a GitHub contents API response for a repo.config.json */
function makeConfigResponse(config, { path = 'repo.config.json' } = {}) {
  const content = toBase64(JSON.stringify(config));
  return {
    content,
    encoding: 'base64',
    name: 'repo.config.json',
    path,
    sha: 'abc123',
    size: content.length,
    type: 'file',
    url: `https://api.github.com/repos/testuser/repo/contents/${path}`,
  };
}

/** Build a Git Trees API response */
function makeTreeResponse(items = []) {
  return {
    sha: 'tree-sha-123',
    url: 'https://api.github.com/repos/testuser/repo/git/trees/main',
    tree: items,
    truncated: false,
  };
}

/** Build a tree item (blob or tree) */
function makeTreeItem(path, type = 'blob', sha = 'item-sha-' + path) {
  return { path, mode: type === 'tree' ? '040000' : '100644', type, sha, url: '' };
}

/** Create a mock Response object */
function mockResponse(body, { status = 200, ok = true } = {}) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    json: async () => body,
    headers: new Map([
      ['X-RateLimit-Remaining', '50'],
      ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600)],
    ]),
  };
}

/**
 * Helper to create a fetch mock that handles Trees API + Contents API.
 * treeMap: { repoName: treeItems[] } — defines what the tree returns per repo
 * configMap: { urlPattern: response } — defines content responses
 */
function makeFetchMock(repoList, { treeMap = {}, configMap = {} } = {}) {
  return async (url) => {
    // Repo listing
    if (url.includes('/repos?')) {
      return mockResponse(repoList);
    }
    // Git Trees API
    if (url.includes('/git/trees/')) {
      for (const [repoName, treeItems] of Object.entries(treeMap)) {
        if (url.includes(`/${repoName}/git/trees/`)) {
          return mockResponse(makeTreeResponse(treeItems));
        }
      }
      // Default: empty tree
      return mockResponse(makeTreeResponse([]));
    }
    // Contents API or other — check configMap
    for (const [pattern, response] of Object.entries(configMap)) {
      if (url.includes(pattern)) {
        return response;
      }
    }
    return mockResponse(null, { status: 404, ok: false });
  };
}

// --- Setup & Teardown ---

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearCache(); // Ensure no stale cache between tests
});

// --- Tests ---

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

    test('should throw error for username starting with hyphen', async () => {
      await expect(getRepos('-invaliduser')).rejects.toThrow('Invalid GitHub username format');
    });
  });

  describe('Config file location (Trees API)', () => {
    test('should find config in root directory via Trees API', async () => {
      const repos = [makeRepo('root-config')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: {
          'root-config': [makeTreeItem('repo.config.json')],
        },
        configMap: {
          '/root-config/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'Root Config' })
          ),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Root Config');
    });

    test('should fall back to src/ directory when root has no config', async () => {
      const repos = [makeRepo('src-config')];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Root tree has src/ dir but no repo.config.json
      const srcDirSha = 'src-dir-sha';

      globalThis.fetch = async (url) => {
        if (url.includes('/repos?')) return mockResponse(repos);
        // Root tree: only has src/ directory
        if (url.includes('/src-config/git/trees/main')) {
          return mockResponse(makeTreeResponse([makeTreeItem('src', 'tree', srcDirSha)]));
        }
        // src/ subtree: has repo.config.json
        if (url.includes(`/src-config/git/trees/${srcDirSha}`)) {
          return mockResponse(makeTreeResponse([makeTreeItem('repo.config.json')]));
        }
        // Contents API for src/repo.config.json
        if (url.includes('/src-config/contents/src/repo.config.json')) {
          return mockResponse(makeConfigResponse({ published: true, title: 'Src Config' }, { path: 'src/repo.config.json' }));
        }
        return mockResponse(null, { status: 404, ok: false });
      };

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Src Config');

      warnSpy.mockRestore();
    });

    test('should emit deprecation warning when config found in src/', async () => {
      const repos = [makeRepo('legacy-repo')];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const srcDirSha = 'src-sha';

      globalThis.fetch = async (url) => {
        if (url.includes('/repos?')) return mockResponse(repos);
        if (url.includes('/legacy-repo/git/trees/main')) {
          return mockResponse(makeTreeResponse([makeTreeItem('src', 'tree', srcDirSha)]));
        }
        if (url.includes(`/legacy-repo/git/trees/${srcDirSha}`)) {
          return mockResponse(makeTreeResponse([makeTreeItem('repo.config.json')]));
        }
        if (url.includes('/legacy-repo/contents/src/repo.config.json')) {
          return mockResponse(makeConfigResponse({ published: true, title: 'Legacy' }, { path: 'src/repo.config.json' }));
        }
        return mockResponse(null, { status: 404, ok: false });
      };

      await getRepos('testuser', { cacheMs: 0 });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DEPRECATION WARNING')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('legacy-repo')
      );

      warnSpy.mockRestore();
    });

    test('should NOT emit deprecation warning when config found in root', async () => {
      const repos = [makeRepo('modern-repo')];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: {
          'modern-repo': [makeTreeItem('repo.config.json')],
        },
        configMap: {
          '/modern-repo/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'Modern' })
          ),
        },
      });

      await getRepos('testuser', { cacheMs: 0 });

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    test('should prefer root config over src/ config', async () => {
      const repos = [makeRepo('both-configs')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: {
          // Root tree has repo.config.json AND src/ dir
          'both-configs': [makeTreeItem('repo.config.json'), makeTreeItem('src', 'tree')],
        },
        configMap: {
          '/both-configs/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'From Root' })
          ),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('From Root');
    });

    test('should skip repos with no config in tree', async () => {
      const repos = [makeRepo('no-config')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: {
          'no-config': [makeTreeItem('README.md'), makeTreeItem('index.js')],
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });
  });

  describe('Fetching and filtering', () => {
    test('should return published repos with correct metadata', async () => {
      const repos = [
        makeRepo('published-project'),
        makeRepo('unpublished-project'),
      ];

      globalThis.fetch = async (url) => {
        if (url.includes('/repos?')) return mockResponse(repos);
        // Trees API
        if (url.includes('/published-project/git/trees/main')) {
          return mockResponse(makeTreeResponse([makeTreeItem('repo.config.json')]));
        }
        if (url.includes('/unpublished-project/git/trees/main')) {
          return mockResponse(makeTreeResponse([makeTreeItem('repo.config.json')]));
        }
        // Contents API
        if (url.includes('/published-project/contents/repo.config.json')) {
          return mockResponse(makeConfigResponse({
            published: true,
            title: 'My Project',
            info: 'A cool project',
            publicUrl: 'https://example.com',
            thumbnail: 'assets/thumb.png',
            branch: 'main',
            customConfig: { tags: ['typescript'] },
          }));
        }
        if (url.includes('/unpublished-project/contents/repo.config.json')) {
          return mockResponse(makeConfigResponse({ published: false }));
        }
        return mockResponse(null, { status: 404, ok: false });
      };

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'published-project',
        url: 'https://github.com/testuser/published-project',
        publicUrl: 'https://example.com',
        info: 'A cool project',
        title: 'My Project',
        thumbnail: 'https://raw.githubusercontent.com/testuser/published-project/main/assets/thumb.png',
        customConfig: { tags: ['typescript'] },
      });
    });

    test('should skip forked and archived repos', async () => {
      const repos = [
        makeRepo('forked-repo', { fork: true }),
        makeRepo('archived-repo', { archived: true }),
        makeRepo('active-repo'),
      ];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: {
          'active-repo': [makeTreeItem('repo.config.json')],
        },
        configMap: {
          '/active-repo/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'Active' })
          ),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('active-repo');
    });

    test('should return empty array when no repos have config files', async () => {
      const repos = [makeRepo('no-config-repo')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'no-config-repo': [makeTreeItem('README.md')] },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });

    test('should handle repos with no thumbnail gracefully', async () => {
      const repos = [makeRepo('no-thumb')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'no-thumb': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/no-thumb/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'No Thumb' })
          ),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].thumbnail).toBeUndefined();
    });
  });

  describe('Schema validation', () => {
    test('should skip repos with invalid JSON in config', async () => {
      const repos = [makeRepo('bad-json')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'bad-json': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/bad-json/contents/repo.config.json': mockResponse({
            content: toBase64('not valid json {{{'),
            encoding: 'base64',
            name: 'repo.config.json',
            path: 'repo.config.json',
            sha: 'abc',
            size: 10,
            type: 'file',
            url: '',
          }),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });

    test('should skip repos with non-object config', async () => {
      const repos = [makeRepo('array-config')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'array-config': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/array-config/contents/repo.config.json': mockResponse({
            content: toBase64(JSON.stringify([1, 2, 3])),
            encoding: 'base64',
            name: 'repo.config.json',
            path: 'repo.config.json',
            sha: 'abc',
            size: 10,
            type: 'file',
            url: '',
          }),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });

    test('should skip repos where published is not a boolean', async () => {
      const repos = [makeRepo('bad-published')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'bad-published': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/bad-published/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: 'yes', title: 'Bad' })
          ),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });
  });

  describe('Options', () => {
    test('should accept a bare token string for backward compatibility', async () => {
      let capturedHeaders = {};
      const repos = [makeRepo('my-repo')];

      globalThis.fetch = async (url, options) => {
        capturedHeaders = options?.headers || {};
        if (url.includes('/repos?')) return mockResponse(repos);
        if (url.includes('/git/trees/')) return mockResponse(makeTreeResponse([]));
        return mockResponse(null, { status: 404, ok: false });
      };

      await getRepos('testuser', 'ghp_test_token_123');

      expect(capturedHeaders.Authorization).toBe('token ghp_test_token_123');
    });

    test('should call onProgress callback', async () => {
      const repos = [makeRepo('repo-a'), makeRepo('repo-b')];
      const progressCalls = [];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'repo-a': [], 'repo-b': [] },
      });

      await getRepos('testuser', {
        cacheMs: 0,
        onProgress: (processed, total, name) => {
          progressCalls.push({ processed, total, name });
        },
      });

      expect(progressCalls).toHaveLength(2);
      expect(progressCalls[0]).toEqual({ processed: 1, total: 2, name: 'repo-a' });
      expect(progressCalls[1]).toEqual({ processed: 2, total: 2, name: 'repo-b' });
    });

    test('should process sequentially when parallel is false', async () => {
      const repos = [makeRepo('seq-repo')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'seq-repo': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/seq-repo/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'Sequential' })
          ),
        },
      });

      const result = await getRepos('testuser', { parallel: false, cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Sequential');
    });
  });

  describe('Return value structure', () => {
    test('should use repo name as title fallback', async () => {
      const repos = [makeRepo('fallback-title')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'fallback-title': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/fallback-title/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true })
          ),
        },
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result[0].title).toBe('fallback-title');
      expect(result[0].info).toBe('');
      expect(result[0].publicUrl).toBe('');
    });
  });

  describe('Rate limit guardrails', () => {
    test('should abort all requests on 403 rate limit', async () => {
      const repos = [makeRepo('repo-a'), makeRepo('repo-b'), makeRepo('repo-c')];
      let requestCount = 0;

      globalThis.fetch = async (url) => {
        requestCount++;
        if (url.includes('/repos?')) return mockResponse(repos);
        // First tree request succeeds, second triggers 403
        if (url.includes('/repo-a/git/trees/')) {
          return mockResponse(makeTreeResponse([]));
        }
        if (url.includes('/repo-b/git/trees/')) {
          return {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ message: 'API rate limit exceeded' }),
            headers: new Map([
              ['X-RateLimit-Remaining', '0'],
              ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600)],
            ]),
          };
        }
        return mockResponse(makeTreeResponse([]));
      };

      // Should not throw — returns partial results
      const result = await getRepos('testuser', { cacheMs: 0, parallel: false });

      // Should have aborted after the 403 — repo-c should not be processed
      expect(result).toEqual([]);
    });

    test('should return partial results when rate limit hit mid-scan', async () => {
      const repos = [makeRepo('good-repo'), makeRepo('bad-repo')];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = async (url) => {
        if (url.includes('/repos?')) return mockResponse(repos);
        if (url.includes('/good-repo/git/trees/')) {
          return mockResponse(makeTreeResponse([makeTreeItem('repo.config.json')]));
        }
        if (url.includes('/good-repo/contents/repo.config.json')) {
          return mockResponse(makeConfigResponse({ published: true, title: 'Good' }));
        }
        if (url.includes('/bad-repo/git/trees/')) {
          return {
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({}),
            headers: new Map([
              ['X-RateLimit-Remaining', '0'],
              ['X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600)],
            ]),
          };
        }
        return mockResponse(null, { status: 404, ok: false });
      };

      const result = await getRepos('testuser', { cacheMs: 0, parallel: false });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Good');

      warnSpy.mockRestore();
    });

    test('should emit warning when scanning 30+ repos without token', async () => {
      const repos = Array.from({ length: 31 }, (_, i) => makeRepo(`repo-${i}`));
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = async (url) => {
        if (url.includes('/repos?')) return mockResponse(repos);
        if (url.includes('/git/trees/')) return mockResponse(makeTreeResponse([]));
        return mockResponse(null, { status: 404, ok: false });
      };

      await getRepos('testuser', { cacheMs: 0 });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('31 repositories to scan without a token')
      );

      warnSpy.mockRestore();
    }, 15000);
  });

  describe('Cache', () => {
    test('clearCache() should remove all cached entries', async () => {
      const repos = [makeRepo('cached-repo')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'cached-repo': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/cached-repo/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'Cached' })
          ),
        },
      });

      // First call populates cache
      const result1 = await getRepos('testuser', { cacheMs: 60000 });
      expect(result1).toHaveLength(1);

      // Clear cache
      clearCache();

      // Change mock to return different data
      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'cached-repo': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/cached-repo/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'Updated' })
          ),
        },
      });

      // Second call should fetch fresh data
      const result2 = await getRepos('testuser', { cacheMs: 60000 });
      expect(result2[0].title).toBe('Updated');
    });

    test('clearCache(username) should only remove that user\'s entries', async () => {
      const repos = [makeRepo('repo-x')];

      globalThis.fetch = makeFetchMock(repos, {
        treeMap: { 'repo-x': [makeTreeItem('repo.config.json')] },
        configMap: {
          '/repo-x/contents/repo.config.json': mockResponse(
            makeConfigResponse({ published: true, title: 'X' })
          ),
        },
      });

      // Populate cache for testuser
      await getRepos('testuser', { cacheMs: 60000 });

      // Clear only otheruser's cache (should not affect testuser)
      clearCache('otheruser');

      // testuser should still be cached (no fetch needed)
      let fetchCalled = false;
      globalThis.fetch = async () => { fetchCalled = true; return mockResponse([]); };

      const result = await getRepos('testuser', { cacheMs: 60000 });
      expect(fetchCalled).toBe(false);
      expect(result).toHaveLength(1);
    });
  });
});
