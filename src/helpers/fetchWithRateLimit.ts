/**
 * Production-ready browser rate limiter for GitHub API
 * Implements queuing, concurrency control, abort-on-rate-limit, and request budgeting
 */

// Priority constants for different types of requests
export const PRIORITY = {
  CRITICAL: 10,     // Repository listing (must happen first)
  HIGH: 8,          // Recently updated repos (< 30 days)
  MEDIUM: 5,        // Moderately recent repos (< 180 days)
  LOW: 2,           // Older repos (> 180 days)
  RETRY: 1,         // Retry attempts
  DEFAULT: 0        // Default priority
} as const;

interface GitHubRepo {
  updated_at?: string;
  name: string;
}

interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
}

export interface RateLimitError extends Error {
  status?: number;
  waitTime?: number;
  isRateLimit?: boolean;
}

export interface RateLimiterConfig {
  authenticated: boolean;
  requestBudget?: number;
}

/**
 * Calculate priority for a repository based on its last update time
 */
export function calculateRepoPriority(repo: GitHubRepo): number {
  if (!repo.updated_at) return PRIORITY.LOW;
  
  const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate < 30) return PRIORITY.HIGH;      // Recently updated
  if (daysSinceUpdate < 180) return PRIORITY.MEDIUM;   // Moderately recent
  return PRIORITY.LOW;                                  // Older repos
}

class GitHubRateLimiter {
  private queue: QueueItem<Response>[] = [];
  
  private processing = false;
  private lastRequestTime = 0;
  private activeRequests = 0;
  private requestCount = 0;
  private aborted = false;
  private abortReason: string | null = null;
  
  // Configuration — adjusted per-session via configure()
  private config = {
    minInterval: 50,         // 50ms between requests (1200 req/min max)
    maxConcurrent: 6,        // Concurrent requests
    maxRetries: 2,           // Retry failed requests (only for server errors)
    backoffMultiplier: 2,    // Exponential backoff
    maxBackoffTime: 10000,   // Max 10s backoff
    requestBudget: 55,       // Max requests per session (unauthenticated default)
  };

  /**
   * Configure the rate limiter for a new session.
   * Call this before starting a batch of requests.
   */
  configure(options: RateLimiterConfig): void {
    this.requestCount = 0;
    this.aborted = false;
    this.abortReason = null;

    if (options.authenticated) {
      this.config.maxConcurrent = 6;
      this.config.minInterval = 50;
      this.config.requestBudget = options.requestBudget || 500;
    } else {
      // Conservative settings for unauthenticated requests
      this.config.maxConcurrent = 2;
      this.config.minInterval = 200;
      this.config.requestBudget = options.requestBudget || 55;
    }
  }

  /**
   * Abort all pending requests immediately.
   * Active in-flight requests will complete but queued ones are rejected.
   */
  abort(reason: string): void {
    this.aborted = true;
    this.abortReason = reason;

    // Reject all queued items
    const pending = this.queue.splice(0);
    for (const item of pending) {
      const error: RateLimitError = new Error(reason);
      error.isRateLimit = true;
      item.reject(error);
    }
  }

  /**
   * Schedule a request with priority support
   */
  async schedule(fn: () => Promise<Response>, priority: number = 0): Promise<Response> {
    if (this.aborted) {
      const error: RateLimitError = new Error(this.abortReason || 'Rate limiter aborted');
      error.isRateLimit = true;
      return Promise.reject(error);
    }

    if (this.requestCount >= this.config.requestBudget) {
      const error: RateLimitError = new Error(
        `Request budget exhausted (${this.config.requestBudget} requests). ` +
        `Consider providing a GitHub token for higher limits.`
      );
      error.isRateLimit = true;
      return Promise.reject(error);
    }

    return new Promise<Response>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority });
      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  /**
   * Get the number of requests made in the current session
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Check if the rate limiter has been aborted
   */
  isAborted(): boolean {
    return this.aborted;
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || this.activeRequests >= this.config.maxConcurrent || this.aborted) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.config.maxConcurrent && !this.aborted) {
      const item = this.queue.shift()!;
      
      // Enforce minimum interval between requests
      await this.enforceRateLimit();
      
      this.activeRequests++;
      this.requestCount++;
      this.executeRequest(item);
    }

    this.processing = false;
  }

  /**
   * Enforce rate limiting with precise timing
   */
  private async enforceRateLimit(): Promise<void> {
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
  private async executeRequest(item: QueueItem<Response>): Promise<void> {
    let retryCount = 0;
    
    const attemptRequest = async (): Promise<void> => {
      try {
        const result = await item.fn();
        this.activeRequests--;
        item.resolve(result);
        this.processQueue(); // Continue processing
      } catch (error: unknown) {
        retryCount++;
        const rateLimitError = error as RateLimitError;
        
        // If rate limited, abort everything immediately — do NOT retry
        if (rateLimitError.isRateLimit || rateLimitError.status === 403 || rateLimitError.status === 429) {
          this.activeRequests--;
          this.abort(rateLimitError.message || 'GitHub API rate limit exceeded');
          item.reject(rateLimitError);
          return;
        }
        
        // Only retry on server errors and network failures
        if (retryCount <= this.config.maxRetries && this.shouldRetry(rateLimitError)) {
          const backoffTime = Math.min(
            this.config.backoffMultiplier ** retryCount * 1000,
            this.config.maxBackoffTime
          );
          
          setTimeout(() => attemptRequest(), backoffTime);
        } else {
          this.activeRequests--;
          item.reject(rateLimitError);
          this.processQueue(); // Continue processing
        }
      }
    };

    await attemptRequest();
  }

  /**
   * Determine if an error is retryable (only server errors and network failures)
   */
  private shouldRetry(error: RateLimitError): boolean {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    
    // Only retry server errors (5xx)
    if (error.status && error.status >= 500) {
      return true;
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
      requestCount: this.requestCount,
      aborted: this.aborted,
    };
  }
}

// Global rate limiter instance
const rateLimiter = new GitHubRateLimiter();

/**
 * Configure the rate limiter for a new getRepos() session.
 * Must be called before starting requests.
 */
export function configureRateLimiter(options: RateLimiterConfig): void {
  rateLimiter.configure(options);
}

/**
 * Abort all pending requests.
 */
export function abortAllRequests(reason: string): void {
  rateLimiter.abort(reason);
}

/**
 * Check if the rate limiter has been aborted.
 */
export function isRateLimiterAborted(): boolean {
  return rateLimiter.isAborted();
}

/**
 * Get the total number of requests made in the current session.
 */
export function getRequestCount(): number {
  return rateLimiter.getRequestCount();
}

/**
 * Browser-optimized fetch with rate limiting for GitHub API
 */
async function fetchWithRateLimit(
  url: string,
  options: RequestInit,
  priority: number = 0
): Promise<Response> {
  return rateLimiter.schedule(async () => {
    const res = await fetch(url, options);

    // Handle GitHub API rate limiting headers
    const remaining = res.headers.get("X-RateLimit-Remaining");
    const reset = res.headers.get("X-RateLimit-Reset");

    // If we're rate limited, throw immediately (abort will handle the rest)
    if (res.status === 403 && remaining === "0") {
      const resetTime = reset ? parseInt(reset) * 1000 : Date.now() + 60000;
      const waitTime = Math.max(resetTime - Date.now(), 0);
      
      const error: RateLimitError = new Error(
        `GitHub API rate limit exceeded. Resets at ${new Date(resetTime).toISOString()}. ` +
        `Consider providing a token for 5,000 requests/hour.`
      );
      error.status = 403;
      error.waitTime = waitTime;
      error.isRateLimit = true;
      throw error;
    }

    // Handle 429 Too Many Requests (secondary rate limit / abuse detection)
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      
      const error: RateLimitError = new Error(
        `GitHub API abuse detection triggered (429). Retry after ${Math.ceil(waitTime / 1000)}s. ` +
        `The library will abort remaining requests to prevent further blocking.`
      );
      error.status = 429;
      error.waitTime = waitTime;
      error.isRateLimit = true;
      throw error;
    }

    // Handle other HTTP errors (404 etc.)
    if (!res.ok) {
      const error: RateLimitError = new Error(`HTTP ${res.status}: ${res.statusText}`);
      error.status = res.status;
      throw error;
    }

    return res;
  }, priority);
}

export default fetchWithRateLimit;
