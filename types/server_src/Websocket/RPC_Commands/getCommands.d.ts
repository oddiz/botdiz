import { AllowedGuild } from "../../db/databaseTypes";
import { GuildMember } from "discord.js";
declare type unauthorizedResponse = {
    status: "unauthorized";
};
declare type getTextChannelsSuccess = {
    status: "success";
    channels: {
        name: string | undefined;
        id: string | undefined;
    }[];
};
declare type getTextChannelsFailed = {
    status: "failed";
    command: "RPC_getTextChannels";
};
declare type getTextChannelsReturn = getTextChannelsSuccess | getTextChannelsFailed | unauthorizedResponse;
declare const getCommands: {
    RPC_getGuilds: (allowedGuilds: AllowedGuild[] | "ALL") => Promise<AllowedGuild[] | {
        id: string;
        name: string;
        icon: string | null;
        administrator: boolean;
        botdiz_guild: boolean;
    }[] | {
        status: string;
        command: string;
    }>;
    RPC_getTextChannels: (allowedGuilds: AllowedGuild[] | "ALL", activeGuildId: string) => Promise<getTextChannelsReturn>;
    RPC_getTextChannelContent: (allowedGuilds: AllowedGuild[] | "ALL", activeGuildId: string, channelId: string) => Promise<{
        status: string;
    } | {
        status: string;
        messages: {
            type: import("discord.js").MessageType;
            author: string;
            authorColor: `#${string}` | null;
            content: string;
        }[];
        command: string;
        message?: undefined;
    } | {
        status: string;
        message: string;
        command: string;
        messages?: undefined;
    } | undefined>;
    RPC_getVoiceChannels: (allowedGuilds: AllowedGuild[] | "ALL", activeGuildId: string) => Promise<{
        status: string;
    } | {
        status: string;
        voiceChannels: {
            name: string;
            id: string;
            members: import("@discordjs/collection").Collection<string, GuildMember>;
        }[];
    }>;
};
export default getCommands;
