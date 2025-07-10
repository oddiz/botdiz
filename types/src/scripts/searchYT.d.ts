import "dotenv/config";
export type YoutubeSearchResult = {
    videoUrl: string;
    videoId: string;
    videoTitle: string;
    videoThumbnailUrl: string | null;
    videoDuration?: string;
};
declare const _default: (query: string, maxResults: number, callback: (result: YoutubeSearchResult | void) => void) => Promise<void>;
export default _default;
