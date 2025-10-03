import React, { useState, useCallback } from 'react';
import { getRepos } from 'portfolio-github-integration';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [maxRepos, setMaxRepos] = useState(100);
  const [parallel, setParallel] = useState(true);
  const [cacheMs, setCacheMs] = useState(20 * 60 * 1000); // 20 minutes
  const [debug, setDebug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, repoName: '' });

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a GitHub username');
      return;
    }

    setLoading(true);
    setError('');
    setRepos([]);
    setProgress({ current: 0, total: 0, repoName: '' });

    try {
      const options = {
        ...(token.trim() && { token: token.trim() }),
        maxRepos: parseInt(maxRepos) || 100,
        parallel,
        cacheMs: parseInt(cacheMs) || 20 * 60 * 1000,
        debug,
        onProgress: (current, total, repoName) => {
          setProgress({ current, total, repoName });
        }
      };

      console.log('Fetching repos with options:', options);
      const portfolioData = await getRepos(username.trim(), options);
      setRepos(portfolioData);
      console.log('Fetched repos:', portfolioData);
    } catch (err) {
      setError(err.message || 'Failed to fetch repositories');
      console.error('Error fetching repos:', err);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, repoName: '' });
    }
  }, [username, token, maxRepos, parallel, cacheMs, debug]);

  const formatCacheTime = (ms) => {
    const minutes = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>GitHub Portfolio Integration Demo</h1>
        <p>Test the portfolio-github-integration library with your GitHub repositories</p>
      </header>

      <main className="App-main">
        <form onSubmit={handleSubmit} className="config-form">
          <div className="form-section">
            <h2>Basic Configuration</h2>
            <div className="form-group">
              <label htmlFor="username">GitHub Username *</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., octocat"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="token">GitHub Token (optional)</label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx (for private repos & higher rate limits)"
              />
              <small>Leave empty for public repositories only</small>
            </div>
          </div>

          <div className="form-section">
            <h2>Advanced Options</h2>
            <div className="form-group">
              <label htmlFor="maxRepos">Max Repositories</label>
              <input
                id="maxRepos"
                type="number"
                min="1"
                max="1000"
                value={maxRepos}
                onChange={(e) => setMaxRepos(e.target.value)}
              />
              <small>Maximum number of repositories to scan (default: 100)</small>
            </div>

            <div className="form-group">
              <label htmlFor="cacheMs">Cache Duration (minutes)</label>
              <input
                id="cacheMs"
                type="number"
                min="0"
                value={Math.floor(cacheMs / (60 * 1000))}
                onChange={(e) => setCacheMs((parseInt(e.target.value) || 0) * 60 * 1000)}
              />
              <small>Cache results for faster subsequent requests (current: {formatCacheTime(cacheMs)})</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={parallel}
                  onChange={(e) => setParallel(e.target.checked)}
                />
                Enable Parallel Processing
              </label>
              <small>Process repositories in parallel for faster results</small>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={debug}
                  onChange={(e) => setDebug(e.target.checked)}
                />
                Enable Debug Mode
              </label>
              <small>Show detailed console logging during repository scanning</small>
            </div>
          </div>

          <button type="submit" disabled={loading || !username.trim()} className="submit-btn">
            {loading ? 'Fetching Repositories...' : 'Get Portfolio Repositories'}
          </button>
        </form>

        {loading && progress.total > 0 && (
          <div className="progress-section">
            <h3>Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <p>
              Processing {progress.current} of {progress.total} repositories
              {progress.repoName && <span> - Currently: <strong>{progress.repoName}</strong></span>}
            </p>
          </div>
        )}

        {error && (
          <div className="error-section">
            <h3>Error</h3>
            <p className="error-message">{error}</p>
          </div>
        )}

        {repos.length > 0 && (
          <div className="results-section">
            <h3>Portfolio Repositories ({repos.length} found)</h3>
            <div className="repos-grid">
              {repos.map((repo, index) => (
                <div key={index} className="repo-card">
                  <div className="repo-header">
                    <h4>{repo.title || repo.name}</h4>
                    <div className="repo-links">
                      <a href={repo.url} target="_blank" rel="noopener noreferrer" className="github-link">
                        GitHub
                      </a>
                      {repo.publicUrl && (
                        <a href={repo.publicUrl} target="_blank" rel="noopener noreferrer" className="demo-link">
                          Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {repo.thumbnail && (
                    <div className="repo-thumbnail">
                      <img src={repo.thumbnail} alt={repo.title || repo.name} />
                    </div>
                  )}
                  
                  <div className="repo-content">
                    <p className="repo-description">{repo.info || 'No description available'}</p>
                    
                    {repo.customConfig && (
                      <div className="custom-config">
                        <h5>Custom Configuration:</h5>
                        <pre>{JSON.stringify(repo.customConfig, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && repos.length === 0 && username && !error && (
          <div className="no-results">
            <h3>No Portfolio Repositories Found</h3>
            <p>No repositories with <code>src/repo.config.json</code> files containing <code>"published": true</code> were found.</p>
            <p>To test this library:</p>
            <ol>
              <li>Create a <code>src/repo.config.json</code> file in one of your repositories</li>
              <li>Add the following content:</li>
            </ol>
            <pre className="config-example">
{`{
  "published": true,
  "title": "My Awesome Project",
  "info": "A brief description of what this project does",
  "publicUrl": "https://your-project-url.com",
  "thumbnail": "assets/screenshot.png",
  "customConfig": {
    "tags": ["react", "typescript"],
    "featured": true
  }
}`}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
