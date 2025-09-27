import RepoMetadata from "../interfaces/IrepoMetadata";
export declare const cache: Map<string, {
    data: any;
    timestamp: number;
}>;
/**
 * Get data from cache if it's still valid
 */
export declare function getFromCache(key: string, maxAge: number): RepoMetadata[] | null;
//# sourceMappingURL=getFromCache.d.ts.map