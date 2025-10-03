# GitHub Portfolio Integration Demo (Vue.js)

This is a comprehensive Vue.js example demonstrating the `portfolio-github-integration` library. The app provides a user-friendly interface to test all features of the library, including fetching portfolio metadata from GitHub repositories.

## Features

- **Interactive Configuration**: Enter GitHub username, token, and customize all library options
- **Real-time Progress**: Visual progress bar showing repository scanning progress
- **Comprehensive Results Display**: Shows all portfolio repositories with thumbnails, descriptions, and custom configurations
- **Error Handling**: Clear error messages for troubleshooting
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, professional interface with smooth animations
- **Vue 3 Composition API**: Built with modern Vue.js patterns and reactivity

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

### Prerequisites

- Node.js 18+ (Vue 3 + Vite requirement)
- npm or yarn

### Installation

1. Navigate to this directory:
   ```bash
   cd examples/Vue/github-integration-example
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

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

## Vue.js Implementation Details

This example showcases modern Vue.js development patterns:

### Composition API Features
- **Reactive References**: `ref()` for mutable state
- **Computed Properties**: Derived state with `computed()`
- **Two-way Binding**: `v-model` for form inputs
- **Event Handling**: `@submit.prevent` for form submission
- **Conditional Rendering**: `v-if` and `v-for` directives

### State Management
```javascript
// Reactive state
const username = ref('')
const loading = ref(false)
const repos = ref([])

// Computed properties
const progressPercentage = computed(() => {
  if (progress.value.total === 0) return 0
  return (progress.value.current / progress.value.total) * 100
})

// Methods
const handleSubmit = async () => {
  // Handle form submission
}
```

### Template Features
- **Dynamic Classes**: `:class` and `:style` bindings
- **Conditional Rendering**: `v-if`, `v-else-if`, `v-else`
- **List Rendering**: `v-for` with proper `:key` bindings
- **Event Modifiers**: `.prevent` for form handling

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
       "tags": ["vue", "typescript"],
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

### `npm run dev`
Runs the app in development mode with hot-reload at [http://localhost:5173](http://localhost:5173)

### `npm run build`
Builds the app for production to the `dist` folder

### `npm run preview`
Preview the production build locally

## Technology Stack

- **Vue 3**: Progressive JavaScript framework with Composition API
- **Vite**: Next-generation frontend build tool
- **portfolio-github-integration**: GitHub repository metadata library
- **Modern CSS**: Grid, Flexbox, and CSS custom properties
- **ES Modules**: Native JavaScript module system

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

**Vue.js specific issues?**
- Make sure you're using Node.js 18+
- Check browser console for any JavaScript errors
- Ensure all dependencies are installed with `npm install`

## Learn More

- [portfolio-github-integration Library](../../../README.md)
- [Vue.js Documentation](https://vuejs.org/)
- [Vite Documentation](https://vite.dev/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
