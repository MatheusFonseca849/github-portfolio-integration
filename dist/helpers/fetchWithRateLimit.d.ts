/**
 * Production-ready browser rate limiter for GitHub API
 * Implements sophisticated queuing, concurrency control, and retry logic
 */
export declare const PRIORITY: {
    readonly CRITICAL: 10;
    readonly HIGH: 8;
    readonly MEDIUM: 5;
    readonly LOW: 2;
    readonly RETRY: 1;
    readonly DEFAULT: 0;
};
/**
 * Calculate priority for a repository based on its last update time
 */
export declare function calculateRepoPriority(repo: any): number;
/**
 * Browser-optimized fetch with rate limiting for GitHub API
 */
declare function fetchWithRateLimit(url: string, options: any, priority?: number): Promise<Response>;
export default fetchWithRateLimit;
//# sourceMappingURL=fetchWithRateLimit.d.ts.map