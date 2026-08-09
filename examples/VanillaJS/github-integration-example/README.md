# GitHub Portfolio Integration Demo (Vanilla JavaScript)

This is a comprehensive Vanilla JavaScript example demonstrating the `portfolio-github-integration` library. The app provides a user-friendly interface to test all features of the library using pure HTML, CSS, and JavaScript with no build tools required.

## Features

- **Pure Vanilla JavaScript**: No frameworks, no build tools, just HTML, CSS, and JavaScript
- **Two Implementation Options**: Local npm version and CDN version
- **Interactive Configuration**: Enter GitHub username, token, and customize all library options
- **Real-time Progress**: Visual progress bar showing repository scanning progress
- **Comprehensive Results Display**: Shows all portfolio repositories with thumbnails, descriptions, and custom configurations
- **Error Handling**: Clear error messages for troubleshooting
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface with smooth animations

## What This Demo Shows

This example demonstrates all features of the `portfolio-github-integration` library:

1. **Basic Usage**: Fetch public repositories by username
2. **Authentication**: Use GitHub tokens for private repos and higher rate limits
3. **Advanced Options**: Configure max repositories, cache duration, parallel processing, and debug mode
4. **Progress Callbacks**: Real-time updates during repository scanning
5. **Result Display**: Show all returned metadata including:
   - Repository name and title
   - Description and thumbnail images
   - GitHub and live demo URLs (including new `publicUrl` field)
   - Custom configuration objects

## Getting Started

### Option 1: CDN Version (Recommended for Quick Testing)

The easiest way to get started - no installation required!

1. **Open the CDN version**: Open `index-cdn.html` in a modern web browser
2. **That's it!** The library loads automatically from CDN using import maps

**Browser Requirements for CDN version:**
- Chrome 89+, Firefox 108+, Safari 16.4+, Edge 89+ (for import maps support)

### Option 2: Local npm Version

For development or when you need the latest version:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start a local server**:
   ```bash
   npm start
   # or
   python3 -m http.server 8080
   # or
   npx serve .
   ```

3. **Open in browser**: Navigate to `http://localhost:8080`

## File Structure

```
VanilaJS/
├── index.html          # Main version (requires npm install)
├── index-cdn.html      # CDN version (no installation needed)
├── script.js           # JavaScript for main version
├── script-cdn.js       # JavaScript for CDN version
├── styles.css          # Shared CSS styles
├── package.json        # npm configuration
└── README.md          # This file
```

## How to Use

1. **Enter GitHub Username**: Type any GitHub username (try "octocat" for testing)

2. **Optional: Add GitHub Token**: 
   - For private repositories access
   - For higher rate limits (5,000 vs 60 requests/hour)
   - Get one at: GitHub Settings → Developer settings → Personal access tokens

3. **Configure Advanced Options**:
   - **Max Repositories**: Limit how many repos to scan (default: 100)
   - **Cache Duration**: How long to cache results (default: 20 minutes)
   - **Parallel Processing**: Enable for faster scanning (recommended)
   - **Debug Mode**: Enable detailed console logging for development and troubleshooting

4. **Click "Get Portfolio Repositories"** and watch the progress bar

5. **View Results**: See all repositories with `src/repo.config.json` files containing `"published": true`

## Vanilla JavaScript Implementation Details

This example showcases modern vanilla JavaScript patterns:

### ES Modules
```javascript
// Import from CDN using import maps
import { getRepos } from 'portfolio-github-integration';

// Or import from local node_modules
import { getRepos } from './node_modules/portfolio-github-integration/dist/index.js';
```

### DOM Manipulation
```javascript
// Modern DOM selection and manipulation
const form = document.getElementById('config-form');
const progressFill = document.getElementById('progress-fill');

// Dynamic content creation
function createRepoCard(repo) {
  const card = document.createElement('div');
  card.className = 'repo-card';
  // ... build card structure
  return card;
}
```

### Event Handling
```javascript
// Form submission with async/await
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  // Handle form submission
});

// Input event listeners
cacheMsInput.addEventListener('input', updateCacheDisplay);
```

### State Management
```javascript
// Simple state variables
let loading = false;
let repos = [];

// State update functions
function showSection(section) {
  // Hide all sections, show requested one
}
```

## Testing the Library

To test with your own repositories:

1. Create a `src/repo.config.json` file in any of your GitHub repositories
2. Add this content:
   ```json
   {
     "published": true,
     "title": "My Awesome Project",
     "info": "A brief description of what this project does",
     "publicUrl": "https://your-project-url.com",
     "thumbnail": "assets/screenshot.png",
     "customConfig": {
       "tags": ["javascript", "html", "css"],
       "featured": true,
       "difficulty": "beginner"
     }
   }
   ```
3. Use your GitHub username in the demo
4. The repository should appear in the results!

## Configuration File Schema

The library looks for `src/repo.config.json` files with this structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `published` | boolean | ✅ | Whether to include this repo in results |
| `title` | string | ❌ | Display title for the project |
| `info` | string | ❌ | Project description |
| `publicUrl` | string | ❌ | Public URL of deployed project |
| `thumbnail` | string | ❌ | Path to thumbnail image (relative to repo root) |
| `branch` | string | ❌ | Branch for thumbnail URL (defaults to "main") |
| `customConfig` | object | ❌ | Any custom metadata you want to include |

## Available Scripts

### `npm start`
Starts a local HTTP server (tries Python first, then npx serve)

### `npm run serve`
Uses npx serve to start a local server

### `npm run install-lib`
Installs the portfolio-github-integration library locally

## Technology Stack

- **HTML5**: Semantic markup with modern features
- **CSS3**: Grid, Flexbox, custom properties, and modern styling
- **ES2020+ JavaScript**: Modules, async/await, destructuring
- **portfolio-github-integration**: GitHub repository metadata library
- **No Build Tools**: Direct browser execution with ES modules

## Browser Compatibility

### CDN Version (index-cdn.html)
- **Chrome 89+** (import maps support)
- **Firefox 108+** (import maps support)
- **Safari 16.4+** (import maps support)
- **Edge 89+** (import maps support)

### Local Version (index.html)
- **Chrome 61+** (ES modules support)
- **Firefox 60+** (ES modules support)
- **Safari 10.1+** (ES modules support)
- **Edge 16+** (ES modules support)

## Library Documentation

For complete documentation of the `portfolio-github-integration` library, see the main [README.md](../../../README.md) in the project root.

## Troubleshooting

**Library not loading?**
- For CDN version: Ensure you have a modern browser with import maps support
- For local version: Make sure you're serving files through HTTP (not file://)
- Check browser console for any error messages

**No repositories found?**
- Make sure you have `src/repo.config.json` files in your repositories
- Ensure the config files contain `"published": true`
- Check that the JSON is valid

**Rate limit errors?**
- Add a GitHub Personal Access Token
- Reduce the "Max Repositories" setting
- Wait a few minutes and try again

**CORS errors?**
- Make sure you're serving the files through a web server
- The library handles CORS for GitHub API calls automatically

## Learn More

- [portfolio-github-integration Library](../../../README.md)
- [MDN Web Docs - ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN Web Docs - Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
