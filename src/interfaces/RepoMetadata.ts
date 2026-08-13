interface RepoMetadata {
    name: string;
    url: string;
    publicUrl?: string;
    thumbnail?: string | null;
    info: string;
    title: string;
    order?: number;
    customConfig?: Record<string, unknown>;
}

export default RepoMetadata;
