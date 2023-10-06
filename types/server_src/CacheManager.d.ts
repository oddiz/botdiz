import { Collection, GuildMember, NonThreadGuildBasedChannel } from "discord.js";
type BotdizVoiceChannel = {
    name: string;
    id: string;
    members: Collection<string, GuildMember>;
};
declare class CacheManager {
    private voiceChannelsCache;
    private textChannelsCache;
    private needsChannelsUpdate;
    private debug;
    constructor();
    setupChannelUpdateListener(): void;
    getTextChannels(guildId: string): Promise<Collection<string, NonThreadGuildBasedChannel | null> | null>;
    getVoiceChannels(guildId: string): Promise<BotdizVoiceChannel[] | null>;
    updateGuildChannels(guildId: string): Promise<void>;
}
declare const cacheManager: CacheManager;
export default cacheManager;
