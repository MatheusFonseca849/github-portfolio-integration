<script setup>
import { ref, computed } from 'vue'
import { getRepos } from 'portfolio-github-integration'

// Reactive state
const username = ref('')
const token = ref('')
const maxRepos = ref(100)
const parallel = ref(true)
const cacheMs = ref(20 * 60 * 1000) // 20 minutes
const debug = ref(false)
const loading = ref(false)
const repos = ref([])
const error = ref('')
const progress = ref({ current: 0, total: 0, repoName: '' })

// Computed properties
const cacheDurationMinutes = computed({
  get: () => Math.floor(cacheMs.value / (60 * 1000)),
  set: (minutes) => {
    cacheMs.value = (minutes || 0) * 60 * 1000
  }
})

const formatCacheTime = (ms) => {
  const minutes = Math.floor(ms / (60 * 1000))
  const hours = Math.floor(minutes / 60)
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes}m`
}

const progressPercentage = computed(() => {
  if (progress.value.total === 0) return 0
  return (progress.value.current / progress.value.total) * 100
})

// Methods
const handleSubmit = async () => {
  if (!username.value.trim()) {
    error.value = 'Please enter a GitHub username'
    return
  }

  loading.value = true
  error.value = ''
  repos.value = []
  progress.value = { current: 0, total: 0, repoName: '' }

  try {
    const options = {
      ...(token.value.trim() && { token: token.value.trim() }),
      maxRepos: parseInt(maxRepos.value) || 100,
      parallel: parallel.value,
      cacheMs: parseInt(cacheMs.value) || 20 * 60 * 1000,
      debug: debug.value,
      onProgress: (current, total, repoName) => {
        progress.value = { current, total, repoName }
      }
    }

    console.log('Fetching repos with options:', options)
    const portfolioData = await getRepos(username.value.trim(), options)
    repos.value = portfolioData
    console.log('Fetched repos:', portfolioData)
  } catch (err) {
    error.value = err.message || 'Failed to fetch repositories'
    console.error('Error fetching repos:', err)
  } finally {
    loading.value = false
    progress.value = { current: 0, total: 0, repoName: '' }
  }
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>GitHub Portfolio Integration Demo</h1>
      <p>Test the portfolio-github-integration library with your GitHub repositories</p>
    </header>

    <main class="app-main">
      <form @submit.prevent="handleSubmit" class="config-form">
        <div class="form-section">
          <h2>Basic Configuration</h2>
          <div class="form-group">
            <label for="username">GitHub Username *</label>
            <input
              id="username"
              type="text"
              v-model="username"
              placeholder="e.g., octocat"
              required
            />
          </div>

          <div class="form-group">
            <label for="token">GitHub Token (optional)</label>
            <input
              id="token"
              type="password"
              v-model="token"
              placeholder="ghp_xxxxxxxxxxxx (for private repos & higher rate limits)"
            />
            <small>Leave empty for public repositories only</small>
          </div>
        </div>

        <div class="form-section">
          <h2>Advanced Options</h2>
          <div class="form-group">
            <label for="maxRepos">Max Repositories</label>
            <input
              id="maxRepos"
              type="number"
              min="1"
              max="1000"
              v-model="maxRepos"
            />
            <small>Maximum number of repositories to scan (default: 100)</small>
          </div>

          <div class="form-group">
            <label for="cacheMs">Cache Duration (minutes)</label>
            <input
              id="cacheMs"
              type="number"
              min="0"
              v-model="cacheDurationMinutes"
            />
            <small>Cache results for faster subsequent requests (current: {{ formatCacheTime(cacheMs) }})</small>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                v-model="parallel"
              />
              Enable Parallel Processing
            </label>
            <small>Process repositories in parallel for faster results</small>
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                v-model="debug"
              />
              Enable Debug Mode
            </label>
            <small>Show detailed console logging during repository scanning</small>
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="loading || !username.trim()" 
          class="submit-btn"
        >
          {{ loading ? 'Fetching Repositories...' : 'Get Portfolio Repositories' }}
        </button>
      </form>

      <div v-if="loading && progress.total > 0" class="progress-section">
        <h3>Progress</h3>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <p>
          Processing {{ progress.current }} of {{ progress.total }} repositories
          <span v-if="progress.repoName"> - Currently: <strong>{{ progress.repoName }}</strong></span>
        </p>
      </div>

      <div v-if="error" class="error-section">
        <h3>Error</h3>
        <p class="error-message">{{ error }}</p>
      </div>

      <div v-if="repos.length > 0" class="results-section">
        <h3>Portfolio Repositories ({{ repos.length }} found)</h3>
        <div class="repos-grid">
          <div v-for="(repo, index) in repos" :key="index" class="repo-card">
            <div class="repo-header">
              <h4>{{ repo.title || repo.name }}</h4>
              <div class="repo-links">
                <a :href="repo.url" target="_blank" rel="noopener noreferrer" class="github-link">
                  GitHub
                </a>
                <a 
                  v-if="repo.publicUrl" 
                  :href="repo.publicUrl" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="demo-link"
                >
                  Live Demo
                </a>
              </div>
            </div>
            
            <div v-if="repo.thumbnail" class="repo-thumbnail">
              <img :src="repo.thumbnail" :alt="repo.title || repo.name" />
            </div>
            
            <div class="repo-content">
              <p class="repo-description">{{ repo.info || 'No description available' }}</p>
              
              <div v-if="repo.customConfig" class="custom-config">
                <h5>Custom Configuration:</h5>
                <pre>{{ JSON.stringify(repo.customConfig, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && repos.length === 0 && username && !error" class="no-results">
        <h3>No Portfolio Repositories Found</h3>
        <p>No repositories with <code>src/repo.config.json</code> files containing <code>"published": true</code> were found.</p>
        <p>To test this library:</p>
        <ol>
          <li>Create a <code>src/repo.config.json</code> file in one of your repositories</li>
          <li>Add the following content:</li>
        </ol>
        <pre class="config-example">{{`{
  "published": true,
  "title": "My Awesome Project",
  "info": "A brief description of what this project does",
  "publicUrl": "https://your-project-url.com",
  "thumbnail": "assets/screenshot.png",
  "customConfig": {
    "tags": ["react", "typescript"],
    "featured": true
  }
}`}}</pre>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Reset and base styles */
* {
  box-sizing: border-box;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8fafc;
  color: #334155;
  line-height: 1.6;
}

code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}

pre {
  background-color: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.9em;
  line-height: 1.5;
}

/* App layout */
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.app-header p {
  margin: 0;
  font-size: 1.1rem;
  opacity: 0.9;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

/* Form styles */
.config-form {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.form-section {
  margin-bottom: 2rem;
}

.form-section:last-of-type {
  margin-bottom: 1rem;
}

.form-section h2 {
  color: #1e293b;
  font-size: 1.5rem;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group input[type="number"] {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input[type="text"]:focus,
.form-group input[type="password"]:focus,
.form-group input[type="number"]:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group small {
  display: block;
  color: #64748b;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-group input[type="checkbox"] {
  margin-right: 0.75rem;
  width: 18px;
  height: 18px;
  accent-color: #667eea;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  width: 100%;
  max-width: 300px;
  display: block;
  margin: 0 auto;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -8px rgba(102, 126, 234, 0.5);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Progress section */
.progress-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  text-align: center;
}

.progress-section h3 {
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

/* Error section */
.error-section {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.error-section h3 {
  color: #dc2626;
  margin: 0 0 1rem 0;
}

.error-message {
  color: #991b1b;
  margin: 0;
}

/* Results section */
.results-section {
  margin-bottom: 2rem;
}

.results-section h3 {
  color: #1e293b;
  font-size: 1.75rem;
  margin: 0 0 2rem 0;
  text-align: center;
}

.repos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.repo-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.repo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 25px -5px rgba(0, 0, 0, 0.15);
}

.repo-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.repo-header h4 {
  margin: 0;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
}

.repo-links {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.repo-links a {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.github-link {
  background-color: #1f2937;
  color: white;
}

.github-link:hover {
  background-color: #111827;
}

.demo-link {
  background-color: #10b981;
  color: white;
}

.demo-link:hover {
  background-color: #059669;
}

.repo-thumbnail {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.repo-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.repo-content {
  padding: 1rem 1.5rem 1.5rem 1.5rem;
}

.repo-description {
  color: #64748b;
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.custom-config {
  margin-top: 1rem;
}

.custom-config h5 {
  color: #374151;
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.custom-config pre {
  margin: 0;
  font-size: 0.8rem;
  max-height: 150px;
  overflow-y: auto;
}

/* No results section */
.no-results {
  background: white;
  border-radius: 12px;
  padding: 3rem 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: center;
  margin-bottom: 2rem;
}

.no-results h3 {
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.no-results p {
  color: #64748b;
  margin: 0 0 1rem 0;
}

.no-results ol {
  text-align: left;
  max-width: 600px;
  margin: 1.5rem auto;
  color: #64748b;
}

.config-example {
  text-align: left;
  max-width: 500px;
  margin: 1.5rem auto 0 auto;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-header {
    padding: 1.5rem;
  }
  
  .app-header h1 {
    font-size: 2rem;
  }
  
  .app-main {
    padding: 1rem;
  }
  
  .config-form {
    padding: 1.5rem;
  }
  
  .repos-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .repo-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .repo-links {
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 1rem;
  }
  
  .app-header h1 {
    font-size: 1.75rem;
  }
  
  .config-form {
    padding: 1rem;
  }
  
  .form-section h2 {
    font-size: 1.25rem;
  }
}
</style>
