import { jest } from '@jest/globals';
import { getRepos } from '../../dist/index.js';

// --- Mock Helpers ---

/** Encode a string to base64 (Node-compatible) */
function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

/** Build a minimal GitHub repo object */
function makeRepo(name, { fork = false, archived = false, daysOld = 10 } = {}) {
  return {
    name,
    html_url: `https://github.com/testuser/${name}`,
    fork,
    archived,
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
 * Helper to create a fetch mock that serves configs from the root path.
 * Returns 404 for src/ paths unless explicitly provided.
 */
function makeFetchMock(repoList, configMap = {}) {
  return async (url) => {
    if (url.includes('/repos?')) {
      return mockResponse(repoList);
    }
    // Check configMap for matching URL substrings
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

  describe('Config file location', () => {
    test('should find config in root directory (preferred)', async () => {
      const repos = [makeRepo('root-config')];

      globalThis.fetch = makeFetchMock(repos, {
        '/root-config/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'Root Config' })
        ),
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Root Config');
    });

    test('should fall back to src/ directory when root has no config', async () => {
      const repos = [makeRepo('src-config')];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = makeFetchMock(repos, {
        '/src-config/contents/src/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'Src Config' }, { path: 'src/repo.config.json' })
        ),
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Src Config');

      warnSpy.mockRestore();
    });

    test('should emit deprecation warning when config found in src/', async () => {
      const repos = [makeRepo('legacy-repo')];
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      globalThis.fetch = makeFetchMock(repos, {
        '/legacy-repo/contents/src/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'Legacy' }, { path: 'src/repo.config.json' })
        ),
      });

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
        '/modern-repo/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'Modern' })
        ),
      });

      await getRepos('testuser', { cacheMs: 0 });

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    test('should prefer root config over src/ config', async () => {
      const repos = [makeRepo('both-configs')];

      globalThis.fetch = makeFetchMock(repos, {
        '/both-configs/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'From Root' })
        ),
        '/both-configs/contents/src/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'From Src' }, { path: 'src/repo.config.json' })
        ),
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('From Root');
    });
  });

  describe('Fetching and filtering', () => {
    test('should return published repos with correct metadata', async () => {
      const repos = [
        makeRepo('published-project'),
        makeRepo('unpublished-project'),
      ];

      globalThis.fetch = async (url) => {
        if (url.includes('/repos?')) {
          return mockResponse(repos);
        }
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
        '/active-repo/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'Active' })
        ),
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('active-repo');
    });

    test('should return empty array when no repos have config files', async () => {
      const repos = [makeRepo('no-config-repo')];

      globalThis.fetch = makeFetchMock(repos, {});

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });

    test('should handle repos with no thumbnail gracefully', async () => {
      const repos = [makeRepo('no-thumb')];

      globalThis.fetch = makeFetchMock(repos, {
        '/no-thumb/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'No Thumb' })
        ),
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
      });

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });

    test('should skip repos with non-object config', async () => {
      const repos = [makeRepo('array-config')];

      globalThis.fetch = makeFetchMock(repos, {
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
      });

      const result = await getRepos('testuser', { cacheMs: 0 });
      expect(result).toEqual([]);
    });

    test('should skip repos where published is not a boolean', async () => {
      const repos = [makeRepo('bad-published')];

      globalThis.fetch = makeFetchMock(repos, {
        '/bad-published/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: 'yes', title: 'Bad' })
        ),
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
        if (url.includes('/repos?')) {
          return mockResponse(repos);
        }
        return mockResponse(null, { status: 404, ok: false });
      };

      await getRepos('testuser', 'ghp_test_token_123');

      expect(capturedHeaders.Authorization).toBe('token ghp_test_token_123');
    });

    test('should call onProgress callback', async () => {
      const repos = [makeRepo('repo-a'), makeRepo('repo-b')];
      const progressCalls = [];

      globalThis.fetch = makeFetchMock(repos, {});

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
        '/seq-repo/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: true, title: 'Sequential' })
        ),
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
        '/fallback-title/contents/repo.config.json': mockResponse(
          makeConfigResponse({ published: true })
        ),
      });

      const result = await getRepos('testuser', { cacheMs: 0 });

      expect(result[0].title).toBe('fallback-title');
      expect(result[0].info).toBe('');
      expect(result[0].publicUrl).toBe('');
    });
  });
});
