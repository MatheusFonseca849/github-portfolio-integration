/**
 * Production-ready browser rate limiter for GitHub API
 * Implements sophisticated queuing, concurrency control, and retry logic
 */
// Priority constants for different types of requests
export const PRIORITY = {
    CRITICAL: 10, // Repository listing (must happen first)
    HIGH: 8, // Recently updated repos (< 30 days)
    MEDIUM: 5, // Moderately recent repos (< 180 days)
    LOW: 2, // Older repos (> 180 days)
    RETRY: 1, // Retry attempts
    DEFAULT: 0 // Default priority
};
/**
 * Calculate priority for a repository based on its last update time
 */
export function calculateRepoPriority(repo) {
    if (!repo.updated_at)
        return PRIORITY.LOW;
    const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30)
        return PRIORITY.HIGH; // Recently updated
    if (daysSinceUpdate < 180)
        return PRIORITY.MEDIUM; // Moderately recent
    return PRIORITY.LOW; // Older repos
}
class GitHubRateLimiter {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.lastRequestTime = 0;
        this.activeRequests = 0;
        // Configuration optimized for GitHub API performance
        this.config = {
            minInterval: 50, // 50ms between requests (1200 req/min max)
            maxConcurrent: 6, // More aggressive concurrent requests
            maxRetries: 3, // Retry failed requests
            backoffMultiplier: 2, // Exponential backoff
            maxBackoffTime: 30000, // Max 30s backoff
        };
    }
    /**
     * Schedule a request with priority support
     */
    async schedule(fn, priority = 0) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject, priority });
            // Sort by priority (higher priority first)
            this.queue.sort((a, b) => b.priority - a.priority);
            this.processQueue();
        });
    }
    /**
     * Process the request queue with sophisticated rate limiting
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0 || this.activeRequests >= this.config.maxConcurrent) {
            return;
        }
        this.processing = true;
        while (this.queue.length > 0 && this.activeRequests < this.config.maxConcurrent) {
            const item = this.queue.shift();
            // Enforce minimum interval between requests
            await this.enforceRateLimit();
            this.activeRequests++;
            this.executeRequest(item);
        }
        this.processing = false;
    }
    /**
     * Enforce rate limiting with precise timing
     */
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.config.minInterval) {
            const delay = this.config.minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    /**
     * Execute request with retry logic and error handling
     */
    async executeRequest(item) {
        let retryCount = 0;
        const attemptRequest = async () => {
            try {
                const result = await item.fn();
                this.activeRequests--;
                item.resolve(result);
                this.processQueue(); // Continue processing
            }
            catch (error) {
                retryCount++;
                // Check if we should retry
                if (retryCount <= this.config.maxRetries && this.shouldRetry(error)) {
                    const backoffTime = Math.min(this.config.backoffMultiplier ** retryCount * 1000, this.config.maxBackoffTime);
                    console.warn(`Request failed, retrying in ${backoffTime}ms (attempt ${retryCount}/${this.config.maxRetries})`);
                    setTimeout(() => attemptRequest(), backoffTime);
                }
                else {
                    this.activeRequests--;
                    item.reject(error);
                    this.processQueue(); // Continue processing
                }
            }
        };
        await attemptRequest();
    }
    /**
     * Determine if an error is retryable
     */
    shouldRetry(error) {
        // Retry on network errors, rate limits, and server errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true; // Network error
        }
        if (error.status) {
            return error.status === 403 || // Rate limited
                error.status === 429 || // Too many requests
                error.status >= 500; // Server errors
        }
        return false;
    }
    /**
     * Get current queue status for monitoring
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            activeRequests: this.activeRequests,
            processing: this.processing,
        };
    }
}
// Global rate limiter instance
const rateLimiter = new GitHubRateLimiter();
/**
 * Browser-optimized fetch with rate limiting for GitHub API
 */
async function fetchWithRateLimit(url, options, priority = 0) {
    return rateLimiter.schedule(async () => {
        const res = await fetch(url, options);
        // Handle GitHub API rate limiting headers
        const remaining = res.headers.get("X-RateLimit-Remaining");
        const reset = res.headers.get("X-RateLimit-Reset");
        // If we're rate limited, throw an error to trigger retry
        if (res.status === 403 && remaining === "0") {
            const resetTime = reset ? parseInt(reset) * 1000 : Date.now() + 60000;
            const waitTime = Math.max(resetTime - Date.now(), 0);
            const error = new Error(`GitHub API rate limit exceeded. Reset at ${new Date(resetTime).toISOString()}`);
            error.status = 403;
            error.waitTime = waitTime;
            throw error;
        }
        // Handle other HTTP errors
        if (!res.ok) {
            const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
            error.status = res.status;
            throw error;
        }
        return res;
    }, priority);
}
export default fetchWithRateLimit;
//# sourceMappingURL=fetchWithRateLimit.js.map