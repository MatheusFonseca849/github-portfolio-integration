# GitHub Portfolio Integration

A TypeScript library that automatically fetches and aggregates portfolio metadata from GitHub repositories containing configuration files.

## Overview

This library scans a GitHub user's repositories for `repo.config.json` files in the `src/` directory and returns a comprehensive array of portfolio metadata for published projects.

## Installation

```bash
npm install portfolio-github-lib
```

## Usage

```typescript
import { getRepos } from 'portfolio-github-lib';

// Basic usage (public repositories only)
const portfolioData = await getRepos('your-github-username');

// With authentication (for private repositories)
const portfolioData = await getRepos('your-github-username', 'your-github-token');

console.log(portfolioData);
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

## Authentication

For private repositories, you'll need a GitHub Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Pass it as the second parameter to `getRepos()`

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

This library is built as an ES Module and includes:
- Full TypeScript support with declaration files
- Jest testing with ES Module compatibility
- Modern `node-fetch` v3+ integration
- Proper error handling and input validation

## Requirements

- Node.js 16+
- TypeScript 5.0+ (for development)
- ES Module support

## License

MIT © Matheus Fonseca
