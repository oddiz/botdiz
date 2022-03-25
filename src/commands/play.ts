import { Command } from '../modules/Command';
import { Controller } from '../modules/Controller';
import { QueueTrack } from '../modules/MusicPlayer/MusicControllerLavalink';
import { CommandInteraction, GuildMember } from 'discord.js';
import spotifyUri, { Album, Playlist, Track } from 'spotify-uri';

import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { logger } from '../logger';
import { spotifyApiManager } from '../modules/SpotifyApiHandler';

export type PlayCommandOptions = {
    query?: string | null;
    forceNext?: boolean;
};
export default async function (
    this: Command,
    invokedMessage?: CommandInteraction | null,
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
            logger.log('error', 'play command is not bound to a controller');
            return;
        }

        if (!musicController) {
            logger.log('error', 'Music controller not found on the controller');
            return;
        }
        const node = musicController.shoukaku.getNode();

        let input;
        if (optionsDefault?.query) {
            input = optionsDefault.query;

            if (!input) {
                return;
            }
        } else if (invokedMessage) {
            input = invokedMessage.options.getString('input');

            // if no arguments passed
            if (!input) {
                self.wrongUsage(invokedMessage, self.name, '');

                return;
            }

            const member = invokedMessage.member;
            if (!(member instanceof GuildMember)) {
                return;
            }
            const memberVoiceChannel = member.voice?.channel;

            if (!memberVoiceChannel) {
                self.reply('You are not in a voice channel.');

                return;
            }

            const botVoiceChannel = invokedMessage?.guild?.me?.voice.channel;
            //discord.js/voice VoiceConnection object
            //https://discordjs.github.io/voice/classes/voiceconnection.html

            // console.log({
            //     memberVoiceChannel: memberVoiceChannel,
            //     botVoiceChannel: botVoiceChannel,
            //     botVoiceConnection: botVoiceConnection,
            //     audioPlayerStatus: musicController.audioPlayerStatus
            // })

            /**
             * if member vc = undefined  ✅
             *      -> "you are not in vc", return
             *
             * if bot vc = undefined ✅
             *      -> join member vc
             *
             *
             * if member vc = bot vc ✅
             *      -> continue
             *
             * if member vc != bot vc: ✅
             *      if bot is playing: ✅
             *          -> bot is already playing, return
             *      if bot is idle: ✅
             *          -> join member voice channel
             *          -> set musiccontroller voicechannel to new
             *          -> continue
             */

            if (!musicController.audioPlayer) {
                logger.log(
                    'error',
                    'Audio player is not found on the music controller, trying to initialize'
                );
                await musicController.init();
            }

            if (!botVoiceChannel) {
                logger.log('info', 'Bot is not in a voice channel, joining now.');

                musicController.setVoiceConnection(memberVoiceChannel);
            } else {
                //bot is in a voice channel

                if (memberVoiceChannel.id !== botVoiceChannel.id) {
                    logger.log('info', "Bot is in a voice channel but not in same member's");
                    if (musicController.audioPlayerStatus === 'PLAYING') {
                        logger.log('info', "Bot is already playing. Won't switch to new channel");

                        self.reply('Bot is already playing in another channel ❗');

                        return;
                    } else {
                        logger.log('info', 'Bot is not playing. Switching to new channel.');

                        // let voiceConnection = await joinVoiceChannel({
                        //     channelId: memberVoiceChannel.id,
                        //     guildId: memberVoiceChannel.guild.id,
                        //     adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                        //     selfMute: false,
                        //     selfDeaf: false
                        // })

                        musicController.setVoiceConnection(memberVoiceChannel);
                    }
                } else if (!musicController.activeVoiceChannel) {
                    //bot is in same voice channel but it doesn't have a voice connection
                    logger.log(
                        'error',
                        "Bot is in same voice channel but doesn't have a voice connection, shouldn't happen."
                    );
                    //shouldn't happen with the new lavalink system

                    // let voiceConnection = await joinVoiceChannel({
                    //     channelId: memberVoiceChannel.id,
                    //     guildId: memberVoiceChannel.guild.id,
                    //     adapterCreator: memberVoiceChannel.guild.voiceAdapterCreator,
                    //     selfMute: false,
                    //     selfDeaf: false
                    // })

                    musicController.setVoiceConnection(memberVoiceChannel);
                }
            }
        } else {
            throw 'No arguments provided';
        }

        if (musicController.queueLock) {
            self.reply('Already processing queue try again in moment.');

            return;
        }
        musicController.queueLock = true;

        let videoUrl, searchMode;

        searchMode = true;

        if (input.includes('/play ')) {
            try {
                //idiot proofing
                input = input.replace('/play ', '').trim();
            } catch (error) {}
        }
        try {
            //link is passed
            videoUrl = new URL(input);
            searchMode = false;
        } catch (error) {
            //no link passed
            searchMode = true;
        }

        if (searchMode) {
            const query = input;
            const searchResult = await node.rest.resolve(query, 'youtube');

            if (searchResult?.tracks.length === 0) {
                musicController.queueLock = false;

                self.reply("`I couldn't find any tracks with query provided!`");

                return;
            }

            const track = searchResult.tracks.shift();
            if (track) {
                self.reply(`\`Added ${track.info.title} to queue!\``);
                musicController.addToQueue(track, optionsDefault.forceNext || false);

                musicController.processQueue();

                return;
            } else {
                musicController.queueLock = false;

                self.reply("`I couldn't find any tracks with query provided!`");

                return;
            }
        } else if (videoUrl) {
            //if URL is provided

            const result = await node.rest.resolve(videoUrl.href); //returns ShoukakuTrackList Object
            //https://deivu.github.io/Shoukaku/?api#ShoukakuTrackList#type

            const { type } = result;

            //if url is not recognized by lavalink
            if (type === 'LOAD_FAILED') {
                //could be spotify link
                if (videoUrl.host.includes('spotify.com')) {
                    try {
                        const parsed = spotifyUri.parse(videoUrl.href);
                        // credentials are optional
                        const spotifyApi = await spotifyApiManager.getSpotifyApi();

                        if (parsed.type === 'playlist' || parsed.type === 'album') {
                            const albumOrPlaylistParsed = parsed as Album | Playlist;
                            const spotifyId = albumOrPlaylistParsed.id;

                            if (parsed.type === 'album') {
                                const albumReply = await spotifyApi.getAlbumTracks(spotifyId);
                                const albumData = albumReply.body;
                                console.log(albumData.items);

                                if ((albumData.items.length = 0)) {
                                    musicController.queueLock = false;

                                    self.reply(
                                        '`Error while trying to add spotify album... Check spotify link again, if issue persists contact oddiz 😟`'
                                    );

                                    return;
                                }

                                for (const item of albumData.items) {
                                    const videoName = item.name;
                                    const videoArtist = item.artists[0].name;
                                    const videoTitle = videoArtist + ' - ' + videoName;
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
                                    musicController.addToQueue(
                                        botdizSong,
                                        optionsDefault.forceNext || false
                                    );
                                }

                                self.reply('`Album added to queue 👍`');
                                musicController.queueLock = false;
                                musicController.processQueue();

                                return;
                            } else if (parsed.type === 'playlist') {
                                const playlistReply = await spotifyApi.getPlaylistTracks(spotifyId);
                                const playlistData = playlistReply.body;

                                for (const item of playlistData.items) {
                                    const videoName = item.track.name;
                                    const videoArtist = item.track.artists[0].name;
                                    const videoTitle = videoArtist + ' - ' + videoName;
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
                                    musicController.addToQueue(
                                        botdizSong,
                                        optionsDefault.forceNext || false
                                    );
                                }
                                self.reply('Playlist added to queue 👍');
                                musicController.queueLock = false;
                                musicController.processQueue();

                                return;
                            }
                        } else if (parsed.type === 'track') {
                            const trackParsed = parsed as Track;
                            const trackId = trackParsed.id;

                            const getTrackResponse = await spotifyApi.getTrack(trackId);
                            const trackData = getTrackResponse.body;

                            const artistName = trackData.artists[0].name;
                            //console.log("artist name:", artistName)
                            const songName = trackData.name;
                            //console.log("songName: ", songName )
                            const isSpotify = true;

                            const botdizSong: QueueTrack = {
                                info: {
                                    trackName: songName,
                                    artist: artistName,
                                    title: artistName + ' - ' + songName,
                                    artistId: trackData.artists[0].id,
                                    trackId: trackData.id,
                                },
                                isSpotify: isSpotify,
                            };
                            musicController.addToQueue(
                                botdizSong,
                                optionsDefault.forceNext || false
                            );
                            self.reply(`Added \`${songName}\``);
                            musicController.queueLock = false;
                            musicController.processQueue();

                            return;
                        }
                    } catch (error) {
                        logger.log('Error while trying to play spotify link: ', error);
                        self.reply('`Error while trying to play spotify link, contact oddiz.`');
                        return;
                    }
                } else {
                    musicController.queueLock = false;
                    self.reply(
                        "`I couldn't find any tracks with URL provided!\nSupported platforms: spotify, youtube, soundcloud`"
                    );
                    return;
                }
            } else {
                try {
                    const { tracks, playlistName } = result;

                    const isPlaylist = type === 'PLAYLIST';
                    const isTrack = type === 'TRACK';

                    if (isPlaylist) {
                        for (const track of tracks) {
                            musicController.addToQueue(track, optionsDefault.forceNext || false);
                        }
                        self.reply('`' + (playlistName || 'Playlist') + ' added to queue 👍`');
                    } else if (isTrack) {
                        const track = tracks.shift();
                        if (track) {
                            musicController.addToQueue(track, optionsDefault.forceNext || false);
                            self.reply(`\`${track.info.title} added to queue 👍\``);
                        }
                    }

                    musicController.processQueue();
                    return;
                } catch (error) {
                    logger.log(
                        'error',
                        'Error while trying to parse result from URL: ' +
                            error +
                            '\n result from lavalink is:' +
                            JSON.stringify(result, null, 2)
                    );
                    musicController.queueLock = false;
                    self.reply('`Error trying to process command, contact oddiz.`');

                    //if there is no song in queue stop the music controller to prevent lockdown.
                    if (musicController.queue.length > 0) {
                        musicController.stop();
                        logger.log('info', 'Stopping music controller- to prevent lockdown.');
                    }
                }
            }
        }
    } catch (error) {
        logger.log('error', 'Error while executing play.js', error);

        if (self.controller?.MusicController) {
            self.controller.MusicController.queueLock = false;
        }
    }
}
