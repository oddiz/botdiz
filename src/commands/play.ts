import { Command } from "../modules/Command";
import { Controller } from "../modules/Controller";
import { QueueTrack } from "../modules/MusicPlayer/MusicControllerLavalink";
import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import spotifyUri, { Album, Playlist, Track } from "spotify-uri";
import "dotenv/config";

import { logger } from "../logger";
import { spotifyApiManager } from "../modules/SpotifyApiHandler";
import { LoadType } from "shoukaku";

export type PlayCommandOptions = {
    query?: string | null;
    forceNext?: boolean;
};
export default async function (
    this: Command,
    invokedMessage?: ChatInputCommandInteraction | null,
    options?: PlayCommandOptions | null
): Promise<void> {
    const self = this;
    const optionsDefault = {
        query: null || options?.query,
        forceNext: false || options?.forceNext,
    };
    try {
        const controller = self.controller as Controller;
        const musicController = controller.MusicController;
        if (!controller) {
            logger.log("error", "play command is not bound to a controller");
            return;
        }

        if (!musicController) {
            logger.log("error", "Music controller not found on the controller");
            return;
        }
        const node = musicController.shoukaku.getIdealNode();

        let input;
        if (optionsDefault?.query) {
            input = optionsDefault.query;

            if (!input) {
                return;
            }
        } else if (invokedMessage) {
            input = invokedMessage.options.getString("input");

            // if no arguments passed
            if (!input) {
                self.wrongUsage(invokedMessage, self.name, "");

                return;
            }

            const member = invokedMessage.member;
            if (!(member instanceof GuildMember)) {
                return;
            }
            const memberVoiceChannel = member.voice?.channel;

            if (!memberVoiceChannel) {
                self.reply("You are not in a voice channel.");

                return;
            }

            const botVoiceChannel = invokedMessage?.guild?.members.me?.voice.channel;

            if (!musicController.audioPlayer) {
                logger.log("error", "Audio player is not found on the music controller, trying to initialize");
                await musicController.init();
            }

            if (!botVoiceChannel) {
                logger.log("info", "Bot is not in a voice channel, joining now.");

                const res = await musicController
                    .setVoiceConnection(memberVoiceChannel)
                    .catch((e) => logger.log("error", "Couldn't join voice channel in first try. Error: " + e));

                if (!res) {
                    //try again
                    const retryres = await musicController.setVoiceConnection(memberVoiceChannel);
                    if (!retryres) {
                        self.reply("I could not join your voice channel.");
                        throw "Could not join voice channel, memberVoiceChannel: " + JSON.stringify(memberVoiceChannel);
                    }
                }
            } else {
                //bot is in a voice channel

                if (memberVoiceChannel.id !== botVoiceChannel.id) {
                    logger.log("info", "Bot is in a voice channel but not in same member's");
                    if (musicController.audioPlayerStatus === "PLAYING") {
                        logger.log("info", "Bot is already playing. Won't switch to new channel");

                        self.reply("Bot is already playing in another channel ❗");

                        return;
                    } else {
                        logger.log("info", "Bot is not playing. Switching to new channel.");

                        musicController.setVoiceConnection(memberVoiceChannel);
                    }
                } else if (!musicController.activeVoiceChannel) {
                    //bot is in same voice channel but it doesn't have a voice connection
                    logger.log(
                        "error",
                        "Bot is in same voice channel but doesn't have a voice connection, shouldn't happen."
                    );
                    //shouldn't happen with the new lavalink system

                    musicController.setVoiceConnection(memberVoiceChannel);
                }
            }
        } else {
            throw "No arguments provided";
        }

        if (musicController.queueLock) {
            self.reply("Already processing queue try again in moment.");

            return;
        }
        musicController.queueLock = true;

        let videoUrl, searchMode;

        searchMode = true;

        try {
            //link is passed
            videoUrl = new URL(input);
            searchMode = false;
        } catch (error) {
            //no link passed
            searchMode = true;
        }
        let result;
        if (searchMode) {
            const query = input;
            result = await node?.rest.resolve("ytsearch:" + query);
        } else if (videoUrl) {
            //if URL is provided

            result = await node?.rest.resolve(videoUrl.href);
        }

        if (!result) throw new Error("No result returned from lavalink");

        const { loadType, data } = result;

        //if url is not recognized by lavalink
        if (videoUrl && loadType === LoadType.ERROR) {
            //could be spotify link
            if (videoUrl.host.includes("spotify.com")) {
                try {
                    const parsed = spotifyUri.parse(videoUrl.href);
                    // credentials are optional
                    const spotifyApi = await spotifyApiManager.getSpotifyApi();

                    if (parsed.type === "playlist" || parsed.type === "album") {
                        const albumOrPlaylistParsed = parsed as Album | Playlist;
                        const spotifyId = albumOrPlaylistParsed.id;

                        if (parsed.type === "album") {
                            const albumReply = await spotifyApi.getAlbumTracks(spotifyId);
                            const albumData = albumReply.body;

                            if (albumData.items.length == 0) {
                                musicController.queueLock = false;

                                self.reply(
                                    "`Error while trying to add spotify album... Check spotify link again, if issue persists contact oddiz 😟`"
                                );

                                return;
                            }

                            for (const item of albumData.items) {
                                const videoName = item.name;
                                const videoArtist = item.artists[0].name;
                                const videoTitle = videoArtist + " - " + videoName;
                                const botdizSong: QueueTrack = {
                                    info: {
                                        artist: videoArtist,
                                        trackName: videoName,
                                        title: videoTitle,
                                        artistId: item.artists[0].id,
                                        trackId: item.id,
                                    },
                                    isSpotify: true,
                                };
                                musicController.addToQueue(botdizSong, optionsDefault.forceNext || false);
                            }

                            self.reply("`Album added to queue 👍`");
                            musicController.queueLock = false;
                            musicController.processQueue();

                            return;
                        } else if (parsed.type === "playlist") {
                            const playlistReply = await spotifyApi.getPlaylistTracks(spotifyId);
                            const playlistData = playlistReply.body;

                            for (const item of playlistData.items) {
                                const videoName = item.track.name;
                                const videoArtist = item.track.artists[0].name;
                                const videoTitle = videoArtist + " - " + videoName;
                                const botdizSong: QueueTrack = {
                                    info: {
                                        artist: videoArtist,
                                        trackName: videoName,
                                        title: videoTitle,
                                        artistId: item.track.artists[0].id,
                                        trackId: item.track.id,
                                    },
                                    isSpotify: true,
                                };
                                musicController.addToQueue(botdizSong, optionsDefault.forceNext || false);
                            }
                            self.reply("Playlist added to queue 👍");
                            musicController.queueLock = false;
                            musicController.processQueue();

                            return;
                        }
                    } else if (parsed.type === "track") {
                        const trackParsed = parsed as Track;
                        const trackId = trackParsed.id;

                        const getTrackResponse = await spotifyApi.getTrack(trackId);
                        const trackData = getTrackResponse.body;

                        const artistName = trackData.artists[0].name;
                        const songName = trackData.name;
                        const isSpotify = true;

                        const botdizSong: QueueTrack = {
                            info: {
                                trackName: songName,
                                artist: artistName,
                                title: artistName + " - " + songName,
                                artistId: trackData.artists[0].id,
                                trackId: trackData.id,
                            },
                            isSpotify: isSpotify,
                        };
                        musicController.addToQueue(botdizSong, optionsDefault.forceNext || false);
                        self.reply(`Added \`${songName}\``);
                        musicController.queueLock = false;
                        musicController.processQueue();

                        return;
                    }
                } catch (error) {
                    logger.log("error", "Error while trying to play spotify link: ", error);
                    self.reply("`Error while trying to play spotify link, contact oddiz.`");

                    musicController.queueLock = false;
                    return;
                }
            } else {
                musicController.queueLock = false;
                self.reply(
                    "`I couldn't find any tracks with URL provided!\nSupported platforms: spotify, youtube, soundcloud`"
                );
                return;
            }
        } else if (loadType === LoadType.PLAYLIST) {
            for (const track of data.tracks) {
                musicController.addToQueue(track, optionsDefault.forceNext || false);
            }
            self.reply("`" + (data.info.name || "Playlist") + " added to queue 👍`");
        } else if (loadType === LoadType.TRACK) {
            const track = data;
            if (track) {
                musicController.addToQueue(track, optionsDefault.forceNext || false);
                self.reply(`\`${track.info.title} added to queue 👍\``);
            }
        } else {
            musicController.queueLock = false;
            throw new Error(
                "Error while trying to parse result from URL:" +
                    "\n result from lavalink is:" +
                    JSON.stringify(result, null, 2)
            );
        }

        musicController.processQueue();
        return;
    } catch (error) {
        logger.log("error", "Error while executing play.js. Error: " + error);
        self.reply("`Error trying to process command, contact oddiz.`");

        if (self.controller?.MusicController) {
            self.controller.MusicController.queueLock = false;
        }
    }
}
