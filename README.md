# GitHub Portfolio Integration

A browser-native TypeScript library that automatically fetches and aggregates portfolio metadata from GitHub repositories containing configuration files. Perfect for dynamic portfolio websites built with React, Vue, Angular, or vanilla JavaScript.

## Overview

This library scans a GitHub user's repositories for `repo.config.json` files and returns a comprehensive array of portfolio metadata for published projects.

> **Migration Notice:** Starting with the next major release (scheduled for **November 30, 2026**), this library will only search for `repo.config.json` in the **root directory** of each repository. The current version supports both root and `src/` locations for backward compatibility, but the `src/` location is deprecated. Please move your `repo.config.json` files to the project root before that date to avoid disruption.

## Installation

```bash
npm install portfolio-github-integration
```

## Usage

### Basic Usage

```typescript
import { getRepos } from 'portfolio-github-integration';

// Simple usage -- no token needed for public repositories
const portfolioData = await getRepos('your-github-username');

console.log(portfolioData);
```

### Advanced Usage with Performance Options

```typescript
import { getRepos } from 'portfolio-github-integration';

// Performance-optimized configuration
const portfolioData = await getRepos('your-github-username', {
  maxRepos: 50,                        // Limit repositories to scan (default: 100)
  parallel: true,                      // Enable parallel processing (default: true)
  cacheMs: 60 * 60 * 1000,            // Cache results for 60 minutes (default: 60 min)
  debug: true,                         // Enable debug console logging (default: false)
  sortBy: 'order',                     // Sort by config's order field (default: 'updated')
  onProgress: (processed, total, repoName) => {
    console.log(`Progress: ${processed}/${total} - Scanning ${repoName}`);
    // Update your UI progress bar here
  }
});

console.log(`Found ${portfolioData.length} published repositories`);
```

### React Integration Example

```jsx
import React, { useState, useEffect } from 'react';
import { getRepos } from 'portfolio-github-integration';

function Portfolio() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const data = await getRepos('your-username', {
          maxRepos: 30,
          debug: false,
          onProgress: (current, total, repoName) => {
            setProgress({ current, total });
          }
        });
        setRepos(data);
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <div>
        Loading portfolio... {progress.current}/{progress.total}
      </div>
    );
  }

  return (
    <div>
      {repos.map(repo => (
        <div key={repo.name}>
          <h3>{repo.title}</h3>
          <p>{repo.info}</p>
          {repo.thumbnail && <img src={repo.thumbnail} alt={repo.title} />}
        </div>
      ))}
    </div>
  );
}
```

## How It Works

1. **Repository Setup**: Add a `repo.config.json` file to the root directory of repositories you want to include in your portfolio
2. **Library Scan**: The library fetches all your repositories and checks for the configuration file (root first, then `src/` as a deprecated fallback)
3. **Metadata Extraction**: Returns an array of metadata for all repositories with `published: true` in their config

## Configuration File Format

Create a `repo.config.json` file in the **root directory** of each repository you want to include:

> **Note:** Previously, this file was placed in `src/repo.config.json`. That location is still supported but deprecated. Please migrate your config files to the project root.

```json
{
  "published": true,
  "title": "My Awesome Project",
  "info": "A brief description of what this project does",
  "publicUrl": "https://your-project-url.com",
  "thumbnail": "assets/screenshot.png",
  "branch": "main",
  "order": 1,
  "customConfig": {
    "tags": ["react", "typescript"],
    "featured": true,
    "difficulty": "intermediate"
  }
}
```

### Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `published` | boolean | Yes | Whether to include this repo in portfolio results |
| `title` | string | No | Display title for the project |
| `info` | string | No | Project description |
| `publicUrl` | string | No | Public URL of the deployed project (e.g., Vercel/Netlify) |
| `thumbnail` | string | No | Path to thumbnail image (relative to repo root) |
| `branch` | string | No | Branch to use for thumbnail URL (defaults to "main") |
| `order` | number | No | Display order (positive integer, lower = first). Used with `sortBy: 'order'` |
| `customConfig` | object | No | Custom configuration object for additional metadata |

## Return Format

The library returns an array of `RepoMetadata` objects:

```typescript
interface RepoMetadata {
  name: string;           // Repository name
  url: string;            // GitHub repository URL
  publicUrl?: string;     // Public URL of the project
  thumbnail?: string;     // Full URL to thumbnail image (optional)
  info: string;           // Project description
  title: string;          // Project title
  order?: number;         // Display order from config (if set)
  customConfig?: Record<string, unknown>;  // Optional custom configuration object
}
```

## Example Response

```typescript
[
  {
    name: "my-portfolio-site",
    url: "https://github.com/username/my-portfolio-site",
    publicUrl: "https://your-project-url.com",
    thumbnail: "https://raw.githubusercontent.com/username/my-portfolio-site/main/assets/screenshot.png",
    info: "A responsive portfolio website built with React",
    title: "Portfolio Website",
    order: 1,
    customConfig: {
      tags: ["react", "typescript"],
      featured: true,
      difficulty: "intermediate"
    }
  },
  {
    name: "data-visualization-tool",
    url: "https://github.com/username/data-visualization-tool",
    publicUrl: "https://your-project-url.com",
    thumbnail: "https://raw.githubusercontent.com/username/data-visualization-tool/main/assets/preview.png",
    info: "Interactive charts and graphs for data analysis",
    title: "Data Viz Tool",
    order: 2,
    customConfig: {
      tags: ["d3", "javascript"],
      featured: false,
      difficulty: "advanced"
    }
  }
]
```

## API Reference

### `getRepos(username, options?)`

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | `string` | GitHub username (required) |
| `options` | `string \| GetReposOptions` | Token string (backward compatible) or options object |

#### Options Object

```typescript
interface GetReposOptions {
  token?: string;           // GitHub Personal Access Token (server-side only)
  maxRepos?: number;        // Max repositories to scan (default: 100)
  parallel?: boolean;       // Enable parallel processing (default: true)
  cacheMs?: number;         // Cache duration in ms (default: 3600000 = 60 min)
  debug?: boolean;          // Enable debug console logging (default: false)
  requestBudget?: number;   // Max API requests per call (default: 55 unauth, 500 auth)
  sortBy?: 'updated' | 'order' | 'title' | 'name' | ((a: RepoMetadata, b: RepoMetadata) => number);
  onProgress?: (processed: number, total: number, repoName: string) => void;
}
```

#### Return Type

```typescript
Promise<RepoMetadata[]>

interface RepoMetadata {
  name: string;           // Repository name
  url: string;            // GitHub repository URL  
  publicUrl?: string;     // Public URL of the project
  thumbnail?: string;     // Full URL to thumbnail image (optional)
  info: string;           // Project description
  title: string;          // Project title
  order?: number;         // Display order from config (if set)
  customConfig?: Record<string, unknown>;  // Custom configuration object
}
```

## Authentication & Token Safety

For most portfolio sites displaying **public repositories, no token is needed**. The GitHub API allows unauthenticated access for public data, and the library's built-in caching (60-minute TTL) ensures you stay well within the 60 requests/hour unauthenticated limit for typical portfolio traffic.

> **Never ship a GitHub token in client-side code.** Tokens embedded in browser bundles are visible to anyone who inspects the page. If your portfolio only displays public repos, simply omit the token.

### When you need a token

A token is only necessary if you:
- Need to display **private repositories** on your portfolio
- Have a **very high-traffic** site that exceeds the unauthenticated rate limit

### Safe token usage (server-side / build-time only)

If you deploy with a framework that supports server-side rendering or static site generation (Next.js, Nuxt, Astro, etc.), you can safely use a token at **build time** -- it never reaches the browser:

```typescript
// In a Next.js getStaticProps, Astro frontmatter, or build script:
const repos = await getRepos('username', {
  token: process.env.GITHUB_TOKEN  // Only available at build time
});
```

### Generating a token (if needed)

1. Go to **GitHub Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens**
2. Click **Generate new token**
3. Select only the **Public Repositories (read-only)** permission (or **Contents: read** for private repos)
4. Store the token in your deployment platform's environment variables -- never commit it to source code

### Rate Limits

| Authentication | Requests per Hour |
|----------------|-------------------|
| No token | 60 requests |
| With token | 5,000 requests |

For context: a portfolio site with 20 repos to scan and the default 60-minute cache will only hit GitHub once per hour per unique visitor session. The unauthenticated limit is more than sufficient for the vast majority of use cases.

### Cache Management

Results are cached in memory for 60 minutes by default. You can manually invalidate the cache when needed:

```typescript
import { clearCache } from 'portfolio-github-integration';

// Clear all cached data
clearCache();

// Clear cache for a specific user only
clearCache('your-github-username');
```

This is useful after deploying a new `repo.config.json` to force a fresh fetch.

## Debug Mode

Enable debug mode to see detailed console logging during repository scanning:

```typescript
const repos = await getRepos('username', {
  debug: true  // Enable console logging (default: false)
});
```

**Debug output includes**:
- Repository scanning progress
- Skipped repositories with reasons
- Processing status updates
- Error details for troubleshooting

**Production recommendation**: Keep `debug: false` (default) in production environments to avoid console pollution.

## Error Handling

The library gracefully handles:
- Repositories without configuration files (skipped silently)
- Invalid JSON in configuration files (skipped with warning in debug mode)
- Malformed config schemas (skipped -- only valid objects with proper field types are accepted)
- Network errors (logged in debug mode and skipped)
- Missing thumbnails (no fallback -- thumbnail property will be undefined)
- **Rate limit exceeded (403)**: Immediately aborts remaining requests and returns repos processed so far
- **Abuse detection (429)**: Aborts all requests to prevent further blocking
- **Request budget exceeded**: Stops processing and returns partial results with a console warning

## Development

### Testing

The library includes comprehensive Jest tests with mocked fetch calls (no network dependency):
- Input validation
- Config file location (Trees API)
- Fetch and filter logic
- Schema validation
- Options and backward compatibility
- Return value structure
- Rate limit guardrails (abort on 403, partial results)
- Cache management (`clearCache`)

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the library
npm run build

# Development mode (watch TypeScript compilation)
npm run dev
```

### ES Module Support

This library is built as a **browser-first ES Module** and includes:
- Full TypeScript support with declaration files
- Jest testing with ES Module compatibility
- Native fetch API integration (works in all modern browsers)
- **Zero external dependencies** -- completely self-contained
- **Browser-native rate limiting** with priority queuing
- **Framework agnostic** -- works with React, Vue, Angular, or vanilla JS
- Proper error handling and input validation

## Performance & Rate Limiting

This library is optimized for fast, reliable portfolio loading:

### Performance Features
- **Parallel Processing**: Scans multiple repositories simultaneously (3-5x faster than sequential)
- **Smart Filtering**: Automatically skips forks, archived repos, and unlikely candidates
- **Repository Limiting**: Configurable limit (default: 100 most recent repos)
- **In-Memory Caching**: Results cached for 60 minutes by default (configurable via `cacheMs`)
- **Progress Callbacks**: Real-time progress updates for better UX

### Rate Limiting System
- **Intelligent Queuing**: Priority-based request scheduling
- **Auth-Aware Concurrency**: 6 concurrent requests (authenticated) or 2 (unauthenticated) to avoid abuse detection
- **Adaptive Timing**: 50ms (authenticated) or 200ms (unauthenticated) minimum interval between requests
- **Abort-on-Rate-Limit**: Immediately cancels all queued requests when a 403/429 is received (no retry cascade)
- **Request Budget**: Configurable cap on total API requests per call (default: 55 unauthenticated, 500 authenticated)
- **Partial Results**: Returns repos processed so far when rate-limited mid-scan
- **Git Trees API**: Uses a single tree request per repo to check for config files, reducing total requests by ~45%
- **Request Prioritization**: Recently-updated repos are fetched first

### Performance Benchmarks
| Scenario | Before Optimization | After Optimization | Improvement |
|----------|-------------------|-------------------|-------------|
| 50 repositories | ~15-30 seconds | ~3-5 seconds | **5-6x faster** |
| 100 repositories | ~30-60 seconds | ~5-8 seconds | **6-8x faster** |
| Cached results | N/A | ~50ms | **Instant** |

### Browser-First Architecture
- **Zero Node.js dependencies** -- completely browser-native
- **Native fetch API** -- no external HTTP libraries
- **ES Modules** -- modern JavaScript module system
- **TypeScript support** -- full type safety and IntelliSense
- **Framework agnostic** -- works with React, Vue, Angular, Svelte, or vanilla JS
- **Lightweight bundle** -- minimal footprint for fast loading

## Requirements

- **Browser**: Modern browsers with native fetch API support (Chrome 42+, Firefox 39+, Safari 10.1+, Edge 14+)
- **Frontend Framework**: Works with React, Vue, Angular, Svelte, or vanilla JavaScript
- **Module System**: ES Modules support required
- **TypeScript**: 5.0+ (for development only)

## Examples & Documentation

### Live Examples

We provide comprehensive example applications demonstrating all library features:

- **[React Example](https://github.com/MatheusFonseca849/github-portfolio-integration/tree/main/examples/React/github-integration-example)** -- Complete React app with Create React App
- **[Vue.js Example](https://github.com/MatheusFonseca849/github-portfolio-integration/tree/main/examples/Vue/github-integration-example)** -- Modern Vue 3 app with Composition API and Vite
- **[Vanilla JavaScript Example](https://github.com/MatheusFonseca849/github-portfolio-integration/tree/main/examples/VanillaJS)** -- Pure HTML/CSS/JS with no build tools required

All examples include:
- Interactive configuration forms for all library options
- Real-time progress tracking with visual progress bars
- Comprehensive results display with repository cards
- Error handling and troubleshooting guidance
- Responsive design for desktop and mobile
- Professional UI with modern styling

### Accessing the Examples

All example applications are available in the GitHub repository. Each example includes detailed setup and running instructions in its respective README file:

- **React Example**: Full-featured React application with comprehensive documentation
- **Vue.js Example**: Modern Vue 3 implementation using Composition API and Vite
- **Vanilla JavaScript Example**: Two versions available -- CDN version (no setup required) and local version

Visit the [GitHub repository](https://github.com/MatheusFonseca849/github-portfolio-integration) to explore the complete example implementations.

## Issues & Support

### Repository

This library is open source and available on GitHub:
**[https://github.com/MatheusFonseca849/github-portfolio-integration](https://github.com/MatheusFonseca849/github-portfolio-integration)**

### Reporting Issues

If you encounter any bugs, issues, or have feature requests, please submit them on our GitHub repository:

1. **Check existing issues** first to avoid duplicates
2. **Create a new issue** with detailed information:
   - Library version you're using
   - Framework and version (React, Vue, etc.)
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Browser and operating system details
   - Any error messages or console logs

**[Submit an Issue](https://github.com/MatheusFonseca849/github-portfolio-integration/issues/new)**

### Getting Help

- **Documentation**: This README contains comprehensive usage instructions
- **Examples**: Check the example applications in the [GitHub repository](https://github.com/MatheusFonseca849/github-portfolio-integration/tree/main/examples)
- **Bug Reports**: Use GitHub Issues for bug reports and feature requests
- **Questions**: GitHub Discussions for general questions and community support

## License

MIT (c) Matheus Fonseca
