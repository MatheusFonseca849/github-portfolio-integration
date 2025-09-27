# GitHub Portfolio Integration Demo

This is a comprehensive React example demonstrating the `portfolio-github-integration` library. The app provides a user-friendly interface to test all features of the library, including fetching portfolio metadata from GitHub repositories.

## Features

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
3. **Advanced Options**: Configure max repositories, cache duration, and parallel processing
4. **Progress Callbacks**: Real-time updates during repository scanning
5. **Result Display**: Show all returned metadata including:
   - Repository name and title
   - Description and thumbnail images
   - GitHub and live demo URLs
   - Custom configuration objects

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Navigate to this directory:
   ```bash
   cd examples/React/github-integration-example
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

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

4. **Click "Get Portfolio Repositories"** and watch the progress bar

5. **View Results**: See all repositories with `src/repo.config.json` files containing `"published": true`

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
       "tags": ["react", "typescript"],
       "featured": true,
       "difficulty": "intermediate"
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
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

## Library Documentation

For complete documentation of the `portfolio-github-integration` library, see the main [README.md](../../../README.md) in the project root.

## Troubleshooting

**No repositories found?**
- Make sure you have `src/repo.config.json` files in your repositories
- Ensure the config files contain `"published": true`
- Check that the JSON is valid

**Rate limit errors?**
- Add a GitHub Personal Access Token
- Reduce the "Max Repositories" setting
- Wait a few minutes and try again

**Network errors?**
- Check your internet connection
- Verify the GitHub username exists
- Try with a different username (like "octocat")

## Learn More

- [portfolio-github-integration Library](../../../README.md)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React Documentation](https://reactjs.org/)
