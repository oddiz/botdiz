import { AllowedGuild, DbDiscordGuild } from '../../db/databaseTypes';
import { client as DiscordClient, GuildControllers } from '../../../src/main';
import { GuildMember, TextChannel } from 'discord.js';
const failed = {
    status: 'failed',
};
type unauthorizedResponse = {
    status: 'unauthorized';
}
type getTextChannelsSuccess = {
    status: 'success',
    channels: { name: string, id: string }[];
}
type getTextChannelsFailed = {
    status: 'failed',
    command: 'RPC_getTextChannels'
}
type getTextChannelsReturn = getTextChannelsSuccess | getTextChannelsFailed | unauthorizedResponse

module.exports = {
    RPC_getGuilds: async function (allowedGuilds: AllowedGuild[] | 'ALL') {
        
        try {
            const guilds = await DiscordClient.guilds.cache;

            //console.log(parsedGuilds)

            if (allowedGuilds === 'ALL') {
                const parsedGuilds = guilds.map((guild) => {
                    return {
                        id: guild.id,
                        name: guild.name,
                        icon: guild.icon,
                        administrator: true,
                        botdiz_guild: true,
                    };
                });
                return parsedGuilds;
            } else {
                return allowedGuilds;
            }
        } catch (error) {
            console.log('Exception in RPC_getGuilds: ', error);
            return {
                status: 'failed',
                command: 'RPC_getGuilds',
            };
        }
    },

    RPC_getTextChannels: async function (
        allowedGuilds: AllowedGuild[] | 'ALL',
        activeGuildId: string
    ): Promise<getTextChannelsReturn> {
        try {
            if (allowedGuilds !== 'ALL') {
                let commandAllowed = false;
                for (const guild of allowedGuilds) {
                    if (
                        activeGuildId === guild.id &&
                        (guild.owner || guild.administrator)
                    ) {
                        commandAllowed = true;
                    }
                }
                if (!commandAllowed) {
                    console.log('Command not allowed!');

                    return { status: 'unauthorized' };
                }
            }
            const guild = await GuildControllers.find(
                (element) => element.guildId === activeGuildId
            )?.guildObj;

            if (!guild) {
                //console.log("found guild")
                throw 'Guild not found?? ID: ' + activeGuildId;
            }

            const channels = await guild.channels.fetch();

            const textChannels = channels
                .filter(
                    (channel) =>
                        channel.type === 'GUILD_TEXT' && channel.viewable
                )
                .map((channel) => {
                    return { name: channel.name, id: channel.id };
                });

            return {
                status: 'success',
                channels: textChannels,
            };
        } catch (error) {
            console.log('Exception in RPC_getTextChannels: ', error);
            return {
                status: 'failed',
                command: 'RPC_getTextChannels',
            };
        }
    },
    
    RPC_getTextChannelContent: async function (
        allowedGuilds: AllowedGuild[] | 'ALL',
        activeGuildId: string,
        channelId: string
    ) {
        try {
            if (allowedGuilds !== 'ALL') {
                let commandAllowed = false;
                for (const guild of allowedGuilds) {
                    if (
                        activeGuildId === guild.id &&
                        (guild.owner || guild.administrator)
                    ) {
                        commandAllowed = true;
                    }
                }
                if (!commandAllowed) {
                    console.log('Command not allowed!');

                    return { status: 'unauthorized' };
                }
            }

            const guild = await GuildControllers.find(
                (element) => element.guildId === activeGuildId
            )?.guildObj;

            if (!guild) {
                //console.log("found guild")
                console.log('Guild not found ID: ', activeGuildId);
                return;
            } 
            //const guildmembers = await guild.members.fetch("241939345290952704")

            //console.log(guildmembers.displayHexColor)
            //console.log(guild.members.cache.get("241939345290952704").displayHexColor)

            const channel = await guild.channels.fetch(channelId) as TextChannel;

            if (!channel) throw 'Channel not found ID: ' + channelId;

            const messages = await channel.messages.fetch({ limit: 25 });

            const parsedMessages = messages.map((message) => {
                let color = guild.members.cache.get(
                    message.author.id
                )?.displayHexColor;

                if (color === '#000000') {
                    color = '#cdcecf';
                }

                return {
                    type: message.type,
                    author: message.author.username,
                    authorColor: color || null,
                    content: message.content,
                };
            });

            return {
                status: "success",
                messages: parsedMessages,
                command: "RPC_getTextChannelContent",
            };
        } catch (error: any) {
            if (error.message.includes('Missing Access')) {
                console.log('Not enough permission to see channel messages');
                return {
                    status: 'failed',
                    message: "Not enough permission to see channel messages",
                    command: 'RPC_getTextChannelContent',
                };
            }
            console.log('Exception in RPC_getTextChannelContent', error);
            return failed;
        }
    },
    RPC_getVoiceChannels: async function (allowedGuilds: AllowedGuild[] | 'ALL', activeGuildId: string) {
        try {
            if (allowedGuilds !== 'ALL') {
                let commandAllowed = false;
                for (const guild of allowedGuilds) {
                    if (activeGuildId === guild.id) {
                        commandAllowed = true;
                    }
                }
                if (!commandAllowed) {
                    console.log('Command not allowed!');

                    return { status: 'unauthorized' };
                }
            }
            const guild = await GuildControllers.find(
                (element) => element.guildId === activeGuildId
            )?.guildObj;

            if (!guild) {
                //console.log("found guild")
                console.log('Guild not found?? ID: ', activeGuildId);
                return failed;
            }

            const channels = await guild.channels.fetch();
            const voiceChannels = channels
                .filter(
                    (channel) =>
                        channel.type === 'GUILD_VOICE' && channel.viewable
                )
                .map((channel) => {
                    return {
                        name: channel.name,
                        id: channel.id,
                        members: channel.members,
                    };
                });

            return {
                status: "success",
                voiceChannels: voiceChannels
            };
        } catch (error) {
            console.log('Exception in RPC_getVoiceChannels: ', error);
            return failed;
        }
    },
};
