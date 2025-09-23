/**
 * Calculate exponential backoff with jitter
 * 
 * @param attempt - The retry attempt number (starting from 1)
 * @param baseDelay - The base delay in ms (default: 500ms)
 * @param maxDelay - The maximum delay in ms (default: 30s)
 * @returns number - The calculated delay in ms
 */
export function getBackoffDelay(
    attempt: number,
    baseDelay = 500,
    maxDelay = 30_000
  ): number {
    // Exponential backoff (2^attempt * baseDelay)
    const expDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  
    // Add jitter: random between 0 and expDelay
    const jitter = Math.random() * expDelay;
  
    return jitter;
  }
  