// Import the library using ES modules with import map
// Note: This requires serving the files through a web server
import { getRepos } from './node_modules/portfolio-github-integration/dist/index.js';

// DOM elements
const form = document.getElementById('config-form');
const usernameInput = document.getElementById('username');
const tokenInput = document.getElementById('token');
const maxReposInput = document.getElementById('maxRepos');
const cacheMsInput = document.getElementById('cacheMs');
const parallelInput = document.getElementById('parallel');
const debugInput = document.getElementById('debug');
const submitBtn = document.getElementById('submit-btn');

const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');

const resultsSection = document.getElementById('results-section');
const resultsTitle = document.getElementById('results-title');
const reposGrid = document.getElementById('repos-grid');

const noResults = document.getElementById('no-results');
const cacheDisplay = document.getElementById('cache-display');

// State
let loading = false;
let repos = [];

// Utility functions
function formatCacheTime(ms) {
  const minutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function updateCacheDisplay() {
  const minutes = parseInt(cacheMsInput.value) || 0;
  const ms = minutes * 60 * 1000;
  cacheDisplay.textContent = formatCacheTime(ms);
}

function showSection(section) {
  // Hide all sections first
  progressSection.style.display = 'none';
  errorSection.style.display = 'none';
  resultsSection.style.display = 'none';
  noResults.style.display = 'none';
  
  // Show the requested section
  if (section) {
    section.style.display = 'block';
  }
}

function updateProgress(current, total, repoName) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  progressFill.style.width = `${percentage}%`;
  
  let text = `Processing ${current} of ${total} repositories`;
  if (repoName) {
    text += ` - Currently: ${repoName}`;
  }
  progressText.textContent = text;
}

function showError(message) {
  errorMessage.textContent = message;
  showSection(errorSection);
}

function createRepoCard(repo) {
  const card = document.createElement('div');
  card.className = 'repo-card';
  
  const header = document.createElement('div');
  header.className = 'repo-header';
  
  const title = document.createElement('h4');
  title.textContent = repo.title || repo.name;
  
  const links = document.createElement('div');
  links.className = 'repo-links';
  
  const githubLink = document.createElement('a');
  githubLink.href = repo.url;
  githubLink.target = '_blank';
  githubLink.rel = 'noopener noreferrer';
  githubLink.className = 'github-link';
  githubLink.textContent = 'GitHub';
  links.appendChild(githubLink);
  
  if (repo.publicUrl) {
    const demoLink = document.createElement('a');
    demoLink.href = repo.publicUrl;
    demoLink.target = '_blank';
    demoLink.rel = 'noopener noreferrer';
    demoLink.className = 'demo-link';
    demoLink.textContent = 'Live Demo';
    links.appendChild(demoLink);
  }
  
  header.appendChild(title);
  header.appendChild(links);
  card.appendChild(header);
  
  // Thumbnail
  if (repo.thumbnail) {
    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'repo-thumbnail';
    
    const img = document.createElement('img');
    img.src = repo.thumbnail;
    img.alt = repo.title || repo.name;
    
    thumbnailDiv.appendChild(img);
    card.appendChild(thumbnailDiv);
  }
  
  // Content
  const content = document.createElement('div');
  content.className = 'repo-content';
  
  const description = document.createElement('p');
  description.className = 'repo-description';
  description.textContent = repo.info || 'No description available';
  content.appendChild(description);
  
  // Custom config
  if (repo.customConfig) {
    const customConfigDiv = document.createElement('div');
    customConfigDiv.className = 'custom-config';
    
    const configTitle = document.createElement('h5');
    configTitle.textContent = 'Custom Configuration:';
    customConfigDiv.appendChild(configTitle);
    
    const configPre = document.createElement('pre');
    configPre.textContent = JSON.stringify(repo.customConfig, null, 2);
    customConfigDiv.appendChild(configPre);
    
    content.appendChild(customConfigDiv);
  }
  
  card.appendChild(content);
  return card;
}

function displayResults(repositories) {
  repos = repositories;
  reposGrid.innerHTML = '';
  
  if (repos.length > 0) {
    resultsTitle.textContent = `Portfolio Repositories (${repos.length} found)`;
    
    repos.forEach(repo => {
      const card = createRepoCard(repo);
      reposGrid.appendChild(card);
    });
    
    showSection(resultsSection);
  } else {
    showSection(noResults);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  
  const username = usernameInput.value.trim();
  if (!username) {
    showError('Please enter a GitHub username');
    return;
  }
  
  loading = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Fetching Repositories...';
  
  // Show progress section
  showSection(progressSection);
  updateProgress(0, 0, '');
  
  try {
    const options = {
      maxRepos: parseInt(maxReposInput.value) || 100,
      parallel: parallelInput.checked,
      cacheMs: (parseInt(cacheMsInput.value) || 20) * 60 * 1000,
      debug: debugInput.checked,
      onProgress: updateProgress
    };
    
    // Add token if provided
    const token = tokenInput.value.trim();
    if (token) {
      options.token = token;
    }
    
    console.log('Fetching repos with options:', options);
    const portfolioData = await getRepos(username, options);
    console.log('Fetched repos:', portfolioData);
    
    displayResults(portfolioData);
  } catch (err) {
    console.error('Error fetching repos:', err);
    showError(err.message || 'Failed to fetch repositories');
  } finally {
    loading = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Get Portfolio Repositories';
  }
}

// Event listeners
form.addEventListener('submit', handleSubmit);
cacheMsInput.addEventListener('input', updateCacheDisplay);

// Initialize cache display
updateCacheDisplay();

// Check if the library is available
if (typeof getRepos === 'undefined') {
  showError('Library not loaded. Please ensure you are serving this page through a web server and the portfolio-github-integration library is installed.');
}
