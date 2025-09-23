/**
 * Calculate exponential backoff with jitter
 *
 * @param attempt - The retry attempt number (starting from 1)
 * @param baseDelay - The base delay in ms (default: 500ms)
 * @param maxDelay - The maximum delay in ms (default: 30s)
 * @returns number - The calculated delay in ms
 */
export declare function getBackoffDelay(attempt: number, baseDelay?: number, maxDelay?: number): number;
//# sourceMappingURL=getBackoffDelay.d.ts.map