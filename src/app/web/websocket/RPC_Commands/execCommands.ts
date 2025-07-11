import { GuildControllers } from "app/web/server";
import { TextChannel, VoiceChannel } from "discord.js";
import type { DbDiscordUser } from "shared/types/databaseTypes";

export type ExecCommandResponse = {
    status: "success" | "failed";
    message?: string;
    command: string;
};

export default execCommands();
function execCommands(): {
    [key: string]: (user: DbDiscordUser, ...args: any[]) => Promise<ExecCommandResponse>;
} {
    return {
        RPC_sendMessage: async function (
            user: DbDiscordUser,
            guildId: string,
            channelId: string,
            message: string
        ): Promise<ExecCommandResponse> {
            try {
                const guild = await GuildControllers.find((element) => element.guildId === guildId)
                    ?.guildObj;

                if (!guild) {
                    throw "Guild not found. ID: " + guildId;
                }

                const channel = (await guild.channels.fetch(channelId)) as TextChannel;

                if (!channel) throw "Channel not found. ID: " + channelId;

                await channel.send({ content: message });

                return {
                    status: "success",
                    command: "RPC_sendMessage",
                    message: "Message sent.",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_sendMessage :", error);

                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_sendMessage",
                };
            }
        },

        RPC_pausePlayer: async function (
            user: DbDiscordUser,
            guildId: string
        ): Promise<ExecCommandResponse> {
            try {
                const guildMusicController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller.MusicController;

                if (!guildMusicController)
                    throw "Guild music controller not found in RPC_pausePlayer. ID: " + guildId;

                await guildMusicController.pause();

                return {
                    status: "success",
                    command: "RPC_pausePlayer",
                    message: "Paused player",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_pausePlayer :", error);
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_pausePlayer",
                };
            }
        },

        RPC_resumePlayer: async function (
            user: DbDiscordUser,
            guildId: string
        ): Promise<ExecCommandResponse> {
            try {
                const guildMusicController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller.MusicController;

                if (!guildMusicController)
                    throw "Guild music controller not found for id: " + guildId;
                await guildMusicController.resume();

                return {
                    status: "success",
                    command: "RPC_resumePlayer",
                    message: "Resumed player",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_resumePlayer :", error);
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_resumePlayer",
                };
            }
        },
        RPC_skipSong: async function (
            user: DbDiscordUser,
            guildId: string,
            skipAmount = 1
        ): Promise<ExecCommandResponse> {
            try {
                if (user.discord_id) {
                    const guildMusicController = await GuildControllers.find(
                        (element) => element.guildId === guildId
                    )?.controller.MusicController;

                    if (!guildMusicController)
                        throw "Guild music controller not found for id: " + guildId;

                    if (guildMusicController.queue.length === 0) {
                        guildMusicController.stop();
                        return {
                            status: "success",
                            command: "RPC_skipSong",
                        };
                    }

                    const result = await guildMusicController.SkipHandler.handleInterface(
                        user.discord_id,
                        skipAmount
                    );

                    if (!result) throw "No result returned from handleInterface";

                    return result;
                }
                console.log("Can't execute skip song command. User doesn't have a discord id.");

                return {
                    status: "failed",
                    command: "RPC_skipSong",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_skipSong :", error);
                return {
                    status: "failed",
                    command: "RPC_skipSong",
                };
            }
        },
        RPC_stopPlayer: async function (
            user: DbDiscordUser,
            guildId: string
        ): Promise<ExecCommandResponse> {
            try {
                const guildMusicController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller.MusicController;

                if (!guildMusicController)
                    throw "Guild music controller not found for id: " + guildId;

                guildMusicController.stop();

                return {
                    status: "success",
                    command: "RPC_stopPlayer",
                    message: "Stopped player",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_stopPlayer :", error);
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_stopPlayer",
                };
            }
        },
        RPC_deleteQueueSong: async function (
            user: DbDiscordUser,
            guildId: string,
            songIndex: number
        ) {
            try {
                const guildMusicController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller.MusicController;

                if (!guildMusicController)
                    throw "Guild music controller not found for id: " + guildId;

                guildMusicController.deleteQueueItem(songIndex);

                return {
                    status: "success",
                    command: "RPC_deleteQueueSong",
                    message: `Deleted ${songIndex}. song.`,
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_deleteQueueSong :", error);
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);
                return {
                    status: "failed",
                    command: "RPC_deleteQueueSong",
                };
            }
        },
        RPC_playCommand: async function (
            user: DbDiscordUser,
            guildId: string,
            queryArg: string
        ): Promise<ExecCommandResponse> {
            try {
                const guildController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller;

                if (!guildController) throw "Guild controller not found for id: " + guildId;

                const playCommand = guildController.commands.find(({ name }) => name === "play");

                if (!playCommand) throw "Play command not found for guild: " + guildId;

                console.log("Play command executed from interface with query: " + queryArg);
                playCommand.execute(null, false, { query: queryArg });

                return {
                    status: "success",
                    message: "Executed play command with query: " + queryArg,
                    command: "RPC_playCommand",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_playCommand: ", error);
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_playCommand",
                };
            }
        },

        /**
         *
         * @param {string} guildId
         * @param {Array} playlistArray Playlist array from module spotifyApi
         */
        RPC_addSpotifyPlaylist: async function (
            user: DbDiscordUser,
            guildId: string,
            playlistArray: SpotifyApi.PlaylistTrackObject[]
        ): Promise<ExecCommandResponse> {
            try {
                const guildController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller;

                if (!guildController?.MusicController)
                    throw "Guild music controller not found for id: " + guildId;

                guildController.MusicController.queueLock = true;

                for (const item of playlistArray) {
                    if (!item.track || !item.track.artists || item.track.artists.length === 0) {
                        continue;
                    }
                    const videoName = item.track.name;
                    const videoArtist = item.track.artists[0].name;
                    const videoTitle = videoArtist + " - " + videoName;
                    const botdizTrack: BotdizTrack = {
                        info: {
                            artist: videoArtist,
                            trackName: videoName,
                            title: videoTitle,
                            trackId: item.track.id,
                            artistId: item.track.artists[0].id,
                        },
                        isSpotify: true,
                    };
                    guildController.MusicController.addToQueue(botdizTrack);
                }

                guildController.MusicController.queueLock = false;
                const result = await guildController.MusicController.processQueue();

                return {
                    status: result,
                    command: "RPC_addSpotifyPlaylist",
                };
            } catch (error) {
                console.log("Error while trying to add spotify playlist");
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                try {
                    const guildController = await GuildControllers.find(
                        (element) => element.guildId === guildId
                    )?.controller;
                    if (!guildController?.MusicController) {
                        return {
                            status: "failed",
                            command: "RPC_addSpotifyPlaylist",
                        };
                    }

                    guildController.MusicController.queueLock = false;
                    return {
                        status: "failed",
                        command: "RPC_addSpotifyPlaylist",
                    };
                } catch (error) {
                    //fail silently
                    return {
                        status: "failed",
                        command: "RPC_addSpotifyPlaylist",
                    };
                }
            }
        },

        RPC_joinVoiceChannel: async function (
            user: DbDiscordUser,
            guildId: string,
            channelId: string
        ): Promise<ExecCommandResponse> {
            try {
                const guildController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                );

                if (!guildController) throw "Guild controller not found for id: " + guildId;

                const channel = await guildController.guildObj.channels.fetch(channelId);
                if (!channel) throw "Channel not found for id: " + channelId;

                if (!(channel instanceof VoiceChannel)) throw "Channel is not a voice channel";

                const musicController = guildController.controller.MusicController;

                if (!musicController) throw "Guild music controller not found for id: " + guildId;

                const result =
                    await guildController.controller.MusicController?.setVoiceConnection(channel);

                if (!result) throw "Failed to join voice channel";
                return {
                    status: "success",
                    command: "RPC_joinVoiceChannel",
                };
            } catch (error) {
                console.log(
                    error,
                    "<-- Error while trying to execute RPC_joinVoiceChannel command"
                );
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_joinVoiceChannel",
                };
            }
        },

        RPC_updateQueue: async function (
            user: DbDiscordUser,
            guildId: string,
            queue: QueueTrack[]
        ): Promise<ExecCommandResponse> {
            try {
                const guildMusicController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller.MusicController;

                if (!guildMusicController)
                    throw "Guild music controller not found for id: " + guildId;

                guildMusicController.updateQueue(queue);

                return {
                    status: "success",
                    command: "RPC_updateQueue",
                };
            } catch (error) {
                console.log(error, "<-- Error while trying to execute RPC_updateQueue");
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_updateQueue",
                };
            }
        },
        RPC_shuffleQueue: async function (user, guildId: string): Promise<ExecCommandResponse> {
            try {
                const guildMusicController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller.MusicController;

                if (!guildMusicController)
                    throw "Guild music controller not found for id: " + guildId;

                if (guildMusicController.queue.length === 0) {
                    guildMusicController.stop();
                    return {
                        status: "failed",
                        command: "RPC_shuffleQueue",
                    };
                }
                const result = await guildMusicController.shuffleQueue();

                if (result) {
                    return {
                        status: "success",
                        command: "RPC_shuffleQueue",
                    };
                }
                console.log("Error while trying to execute RPC_shuffleQueue");

                return {
                    status: "failed",
                    command: "RPC_shuffleQueue",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_shuffleQueue :", error);

                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);

                return {
                    status: "failed",
                    command: "RPC_shuffleQueue",
                };
            }
        },
        RPC_seekTo: async function (
            user: DbDiscordUser,
            guildId: string,
            seekToInMs: number
        ): Promise<ExecCommandResponse> {
            try {
                const guildMusicController = await GuildControllers.find(
                    (element) => element.guildId === guildId
                )?.controller.MusicController;

                if (!guildMusicController)
                    throw "Guild music controller not found for id: " + guildId;

                const result = await guildMusicController.seekTo(seekToInMs);

                return {
                    status: result,
                    command: "RPC_seekTo",
                };
            } catch (error) {
                console.log("Error while trying to execute RPC_deleteQueueSong :", error);
                const parsedUser = {
                    discord_id: user.discord_id,
                    username: user.username,
                };
                console.log("Invoked user: ", parsedUser);
                return {
                    status: "failed",
                    command: "RPC_seekTo",
                };
            }
        },
    };
}
