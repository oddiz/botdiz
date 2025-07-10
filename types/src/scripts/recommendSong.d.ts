import "dotenv/config";
import { BotdizTrack, QueueTrack, YoutubeRecommended } from "../modules/MusicPlayer/MusicControllerLavalink";
export declare const getRecommended: (queueItem: QueueTrack) => Promise<YoutubeRecommended[] | BotdizTrack[]>;
