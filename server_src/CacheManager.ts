import { ChannelType, Collection, GuildMember, NonThreadGuildBasedChannel } from "discord.js";
import LRU from "lru-cache";
import { client, GuildControllers } from "../src/main";
import { logger } from "../src/logger";

const LRUOptions = {
    max: 100,
};

type BotdizVoiceChannel = {
    name: string;
    id: string;
    members: Collection<string, GuildMember>;
};
class CacheManager {
    private voiceChannelsCache: LRU<string, BotdizVoiceChannel[]>;
    private textChannelsCache: LRU<string, Collection<string, NonThreadGuildBasedChannel | null>>;
    private needsChannelsUpdate: Set<string>;
    private debug = true;

    constructor() {
        this.voiceChannelsCache = new LRU(LRUOptions);
        this.textChannelsCache = new LRU(LRUOptions);

        this.needsChannelsUpdate = new Set();

        this.debug = false;
        this.setupChannelUpdateListener();
    }

    setupChannelUpdateListener() {
        const channelEvents = ["channelCreate", "channelDelete", "channelUpdate"];

        client.on("voiceStateUpdate", (oldState) => {
            this.needsChannelsUpdate.add(oldState.guild.id);
        });

        for (const event of channelEvents) {
            client.on(event, async (channel) => {
                if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
                    this.needsChannelsUpdate.add(channel.guild.id);
                    this.debug ? logger.log("info", `Channels of ${channel.guild.name} needs to be updated`) : null;
                }
            });
        }
    }

    async getTextChannels(guildId: string): Promise<Collection<string, NonThreadGuildBasedChannel | null> | null> {
        try {
            if (this.needsChannelsUpdate.has(guildId) || !this.textChannelsCache.has(guildId)) {
                await this.updateGuildChannels(guildId);
            }

            const result = this.textChannelsCache.get(guildId);
            if (!result) return null;

            return result;
        } catch (error) {
            logger.log("error", "Exception in cacheManager.getTextChannels: ", error);
            return null;
        }
    }

    async getVoiceChannels(guildId: string): Promise<BotdizVoiceChannel[] | null> {
        try {
            if (this.needsChannelsUpdate.has(guildId) || !this.voiceChannelsCache.has(guildId)) {
                await this.updateGuildChannels(guildId);
            }

            const result = this.voiceChannelsCache.get(guildId);
            if (!result) return null;

            return result;
        } catch (error) {
            logger.log("error", "Exception in cacheManager.getVoiceChannels: " + error);
            return null;
        }
    }

    async updateGuildChannels(guildId: string) {
        const guild = await GuildControllers.find((element) => element.guildId === guildId)?.guildObj;

        if (!guild) return;

        const guildChannels = await guild.channels.fetch();

        const textChannels = guildChannels.filter((c) => c?.type === ChannelType.GuildText && c.viewable);
        const voiceChannels = guildChannels.filter((c) => c?.type === ChannelType.GuildVoice && c.viewable);

        const mappedVoiceChannels = voiceChannels.map((channel) => {
            return {
                name: channel?.name,
                id: channel?.id,
                members: channel?.members,
            } as BotdizVoiceChannel;
        });

        await this.needsChannelsUpdate.delete(guildId);
        await this.voiceChannelsCache.set(guildId, mappedVoiceChannels);
        await this.textChannelsCache.set(guildId, textChannels);

        this.debug && logger.log("info", `Channels of ${guildId} updated`);
        this.debug &&
            logger.log(
                "info",
                voiceChannels.map((channel) => {
                    return {
                        name: channel?.name,
                        id: channel?.id,
                        members: channel?.members,
                    };
                })
            );
    }
}
const cacheManager = new CacheManager();
export default cacheManager;
