import fetch from "node-fetch";
import Bottleneck from "bottleneck";
import { getBackoffDelay } from "./getBackoffDelay"; // import helper
// Bottleneck limiter: at most 1 request per 100ms
const limiter = new Bottleneck({
    minTime: 100, // 100ms between requests
});
async function fetchWithRateLimit(url, options, retryCount = 0, maxRetries = 5) {
    return limiter.schedule(async () => {
        const res = await fetch(url, options);
        const remaining = res.headers.get("X-RateLimit-Remaining");
        const reset = res.headers.get("X-RateLimit-Reset");
        // Handle rate limiting (status 403 with remaining=0)
        if (res.status === 403 && remaining === "0") {
            if (retryCount >= maxRetries) {
                throw new Error(`Rate limit exceeded. Maximum retries (${maxRetries}) reached.`);
            }
            const resetTime = reset ? parseInt(reset, 10) * 1000 : Date.now() + 60000;
            const waitTime = Math.max(resetTime - Date.now(), 1000);
            console.warn(`Rate limit hit. Waiting ${Math.ceil(waitTime / 1000)}s before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            return fetchWithRateLimit(url, options, retryCount + 1, maxRetries);
        }
        // Retry on transient server errors (5xx)
        if (res.status >= 500 && res.status < 600 && retryCount < maxRetries) {
            const delay = getBackoffDelay(retryCount + 1);
            console.warn(`Server error ${res.status}. Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchWithRateLimit(url, options, retryCount + 1, maxRetries);
        }
        // Log when nearing rate limits
        if (remaining && parseInt(remaining) < 100) {
            console.info(`GitHub API requests remaining: ${remaining}`);
        }
        return res;
    });
}
export default fetchWithRateLimit;
//# sourceMappingURL=fetchWithRateLimit.js.map