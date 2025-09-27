// Simple in-memory cache for browser environments
export const cache = new Map();
/**
 * Get data from cache if it's still valid
 */
export function getFromCache(key, maxAge) {
    if (maxAge <= 0)
        return null;
    const cached = cache.get(key);
    if (!cached)
        return null;
    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
        cache.delete(key);
        return null;
    }
    return cached.data;
}
//# sourceMappingURL=getFromCache.js.map