# GitHub Portfolio Integration

A browser-native TypeScript library that automatically fetches and aggregates portfolio metadata from GitHub repositories containing configuration files. Perfect for dynamic portfolio websites built with React, Vue, Angular, or vanilla JavaScript.

## Overview

This library scans a GitHub user's repositories for `repo.config.json` files in the `src/` directory and returns a comprehensive array of portfolio metadata for published projects.

## Installation

```bash
npm install portfolio-github-integration
```

## Usage

### Basic Usage

```typescript
import { getRepos } from 'portfolio-github-integration';

// Simple usage (public repositories only)
const portfolioData = await getRepos('your-github-username');

// With authentication token (backward compatible)
const portfolioData = await getRepos('your-github-username', 'ghp_your_token_here');

console.log(portfolioData);
```

### Advanced Usage with Performance Options

```typescript
import { getRepos } from 'portfolio-github-integration';

// Performance-optimized configuration
const portfolioData = await getRepos('your-github-username', {
  token: 'ghp_your_token_here',        // GitHub Personal Access Token
  maxRepos: 50,                        // Limit repositories to scan (default: 100)
  parallel: true,                      // Enable parallel processing (default: true)
  cacheMs: 5 * 60 * 1000,             // Cache results for 5 minutes (default: 5 min)
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
          token: process.env.REACT_APP_GITHUB_TOKEN,
          maxRepos: 30,
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
          <img src={repo.thumbnail} alt={repo.title} />
        </div>
      ))}
    </div>
  );
}
```

## How It Works

1. **Repository Setup**: Add a `repo.config.json` file to the `src/` directory of repositories you want to include in your portfolio
2. **Library Scan**: The library fetches all your repositories and checks for the configuration file
3. **Metadata Extraction**: Returns an array of metadata for all repositories with `published: true` in their config

## Configuration File Format

Create a `src/repo.config.json` file in each repository you want to include:

```json
{
  "published": true,
  "title": "My Awesome Project",
  "info": "A brief description of what this project does",
  "thumbnail": "assets/screenshot.png",
  "branch": "main",
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
| `published` | boolean | ✅ | Whether to include this repo in portfolio results |
| `title` | string | ❌ | Display title for the project |
| `info` | string | ❌ | Project description |
| `thumbnail` | string | ❌ | Path to thumbnail image (relative to repo root) |
| `branch` | string | ❌ | Branch to use for thumbnail URL (defaults to "main") |
| `customConfig` | object | ❌ | Custom configuration object for additional metadata |

## Return Format

The library returns an array of `RepoMetadata` objects:

```typescript
interface RepoMetadata {
  name: string;           // Repository name
  url: string;            // GitHub repository URL
  thumbnail: string;      // Full URL to thumbnail image
  info: string;           // Project description
  title: string;          // Project title
  customConfig?: Object;  // Optional custom configuration object
}
```

## Example Response

```typescript
[
  {
    name: "my-portfolio-site",
    url: "https://github.com/username/my-portfolio-site",
    thumbnail: "https://raw.githubusercontent.com/username/my-portfolio-site/main/assets/screenshot.png",
    info: "A responsive portfolio website built with React",
    title: "Portfolio Website",
    customConfig: {
      tags: ["react", "typescript"],
      featured: true,
      difficulty: "intermediate"
    }
  },
  {
    name: "data-visualization-tool",
    url: "https://github.com/username/data-visualization-tool",
    thumbnail: "./assets/default.png",
    info: "Interactive charts and graphs for data analysis",
    title: "Data Viz Tool",
    customConfig: {
      tags: ["d3", "javascript"],
      featured: false,
      difficulty: "advanced"
    }
  }
]
```

## 🔧 API Reference

### `getRepos(username, options?)`

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | `string` | GitHub username (required) |
| `options` | `string \| GetReposOptions` | Token string (backward compatible) or options object |

#### Options Object

```typescript
interface GetReposOptions {
  token?: string;           // GitHub Personal Access Token
  maxRepos?: number;        // Max repositories to scan (default: 100)
  parallel?: boolean;       // Enable parallel processing (default: true)
  cacheMs?: number;         // Cache duration in ms (default: 300000 = 5 min)
  onProgress?: (processed: number, total: number, repoName: string) => void;
}
```

#### Return Type

```typescript
Promise<RepoMetadata[]>

interface RepoMetadata {
  name: string;           // Repository name
  url: string;            // GitHub repository URL  
  thumbnail: string;      // Full URL to thumbnail image
  info: string;           // Project description
  title: string;          // Project title
  customConfig?: any;     // Custom configuration object
}
```

## 🔐 Authentication

For private repositories and higher rate limits, you'll need a GitHub Personal Access Token:

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scopes:
   - `public_repo` (for public repositories)
   - `repo` (for private repositories)
4. Copy the generated token
5. Use it in your code:

```typescript
// Environment variable (recommended)
const repos = await getRepos('username', {
  token: process.env.GITHUB_TOKEN
});

// Direct usage (not recommended for production)
const repos = await getRepos('username', {
  token: 'ghp_your_token_here'
});
```

### Rate Limits

| Authentication | Requests per Hour |
|----------------|-------------------|
| No token | 60 requests |
| With token | 5,000 requests |

## Error Handling

The library gracefully handles:
- Repositories without configuration files (skipped)
- Invalid JSON in configuration files (skipped with warning)
- Network errors (logged and skipped)
- Missing thumbnails (falls back to default)

## Development

### Testing

The library includes comprehensive Jest tests covering:
- Input validation
- API integration
- Error handling
- Return value structure validation

```bash
# Run tests (uses 'octocat' as default test user)
npm test

# Run tests with your own GitHub username
TEST_GITHUB_USERNAME=yourusername npm test

# Or use the custom test script
npm run test:custom --user=yourusername

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
- **Zero external dependencies** - completely self-contained
- **Enterprise-grade browser-native rate limiting**
- **Framework agnostic** - works with React, Vue, Angular, or vanilla JS
- Proper error handling and input validation

## 🚀 Performance & Rate Limiting

This library is built for **maximum performance** with enterprise-grade optimizations:

### ⚡ Performance Features
- **Parallel Processing**: Scans multiple repositories simultaneously (3-5x faster than sequential)
- **Smart Filtering**: Automatically skips forks, archived repos, and unlikely candidates
- **Repository Limiting**: Configurable limit (default: 100 most recent repos)
- **In-Memory Caching**: Results cached for 5 minutes by default (configurable)
- **Progress Callbacks**: Real-time progress updates for better UX
- **Early Termination**: Stops scanning when sufficient results are found

### 🔄 Rate Limiting System
- **Intelligent Queuing**: Priority-based request scheduling
- **Concurrent Control**: Up to 6 simultaneous requests (optimized for GitHub API)
- **Adaptive Timing**: 50ms minimum interval between requests (1,200 req/min max)
- **Exponential Backoff**: Smart retry logic for failed requests
- **Rate Limit Detection**: Automatic GitHub rate limit handling with proper wait times
- **Request Prioritization**: Critical API calls get higher priority

### 📊 Performance Benchmarks
| Scenario | Before Optimization | After Optimization | Improvement |
|----------|-------------------|-------------------|-------------|
| 50 repositories | ~15-30 seconds | ~3-5 seconds | **5-6x faster** |
| 100 repositories | ~30-60 seconds | ~5-8 seconds | **6-8x faster** |
| Cached results | N/A | ~50ms | **Instant** |
| With authentication | Same as above | Same + private repos | **Enhanced access** |

### 🌐 Browser-First Architecture
- **Zero Node.js dependencies** - completely browser-native
- **Native fetch API** - no external HTTP libraries
- **ES Modules** - modern JavaScript module system
- **TypeScript support** - full type safety and IntelliSense
- **Framework agnostic** - works with React, Vue, Angular, Svelte, or vanilla JS
- **Lightweight bundle** - minimal footprint for fast loading

## Requirements

- **Browser**: Modern browsers with native fetch API support (Chrome 42+, Firefox 39+, Safari 10.1+, Edge 14+)
- **Frontend Framework**: Works with React, Vue, Angular, Svelte, or vanilla JavaScript
- **Module System**: ES Modules support required
- **TypeScript**: 5.0+ (for development only)

## License

MIT © Matheus Fonseca
