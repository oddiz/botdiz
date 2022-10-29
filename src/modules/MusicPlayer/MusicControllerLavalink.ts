import fetch from "node-fetch";
import { logger } from "../../logger";
import {
    MessageEmbed,
    MessageActionRow,
    MessageButton,
    TextBasedChannel,
    VoiceBasedChannel,
    Message,
    CommandInteraction,
} from "discord.js";
import { TypedEmitter } from "tiny-typed-emitter";

import { EmbedPlayer } from "./EmbedPlayer";
import { SkipHandler, SkipVoteData } from "./SkipHandler";
import { Controller as BotdizGuildController } from "../../modules/Controller";
import { Command as BotdizCommand } from "../../modules/Command";
import { ShoukakuHandler } from "../../Shokaku/ShokakuHandler";
import { PlayerUpdate, ShoukakuPlayer, ShoukakuTrack } from "shoukaku";
import { DbGuildSettings } from "../../../server_src/db/databaseTypes";
import SpotifyWebApi from "spotify-web-api-node";
import { getRecommended } from "../../scripts/recommendSong";
import { timestampWithMs } from "@sentry/utils";

let playCommand: BotdizCommand;

const defaultSettings = {
    recommendSongs: false,
    skipVotingEnabled: false,
    skipVotingPassPercentage: 0.5,
};

export interface BotdizTrack {
    info: {
        artist: string;
        trackName: string;
        title: string;
        trackId?: string;
        artistId?: string;
    };
    isSpotify: boolean;
    recommendedSong?: boolean;
}
export interface BotdizShoukakuTrack extends ShoukakuTrack {
    recommendedSong?: boolean;
    thumbnail?: string;
}

export interface YoutubeRecommended {
    info: {
        title: string;
    };
    isYoutubeRecommended: boolean;
    recommendedSong: true;
    thumbnail: string;
    isSpotify: false;
}

export type QueueTrack = BotdizTrack | BotdizShoukakuTrack | YoutubeRecommended;

export type AudioPlayerStatus = "PLAYING" | "PAUSED" | "STOPPED" | "SKIPPING";

export interface QueueUpdateEvent {
    op: "queueUpdate";
    queue: QueueTrack[];
    guildId: string;
}
export interface SkipVoteEvent {
    op: "skipVoteUpdate";
    skipVoteData: SkipVoteData;
    guildId: string;
}
export interface CurrentSongUpdateEvent {
    op: "currentSongUpdate";
    currentSong: BotdizShoukakuTrack | null;
    guildId: string;
}
export interface PlayerStatusUpdateEvent {
    op: "playerStatusUpdate";
    status: AudioPlayerStatus;
    guildId: string;
}
export interface CurrentSongUpdateEvent {
    op: "currentSongUpdate";
    currentSong: BotdizShoukakuTrack | null;
    guildId: string;
}
export type MusicControllerEventsData =
    | QueueUpdateEvent
    | SkipVoteEvent
    | CurrentSongUpdateEvent
    | PlayerUpdate
    | PlayerStatusUpdateEvent;

export interface MusicControllerEvents {
    playerUpdate: (data: PlayerUpdate) => void;
    queueUpdate: (data: QueueUpdateEvent) => void;
    skipVoteUpdate: (data: SkipVoteEvent) => void;
    currentSongUpdate: (data: CurrentSongUpdateEvent) => void;
    playerStatusUpdate: (data: PlayerStatusUpdateEvent) => void;
}

export class MusicController extends TypedEmitter<MusicControllerEvents> {
    public controller;
    public guild;
    private volume: number;
    private playCommand: BotdizCommand;
    public UPDATE_INTERVAL: number;
    public EmbedPlayer;
    public SkipHandler;
    public skipVotingEnabled: boolean;
    public skipVotingPassPercentage: number;
    public shoukaku;
    public audioPlayer: ShoukakuPlayer | undefined;
    public recommendSongs: boolean;
    public songHistory: string[];
    public youtubeCookies: string | null;
    public lastInvokedChannel: TextBasedChannel | null;
    public queue: QueueTrack[];
    public queueLock: boolean;
    public currentSong: BotdizShoukakuTrack | null;
    public lastSeekEventTime: number;
    public activeVoiceChannel: VoiceBasedChannel | null;
    public audioPlayerStatus: AudioPlayerStatus;
    public repeat: "ONE" | "ALL" | "NONE";

    constructor(controller: BotdizGuildController, shoukaku: ShoukakuHandler) {
        super();
        this.controller = controller;

        for (const command of this.controller.commands) {
            if (command.name === "play") {
                playCommand = command;

                break;
            }
        }

        this.guild = controller.guild;
        this.volume = 1;
        this.playCommand = playCommand;
        this.UPDATE_INTERVAL = 10000; // player stats update interval in ms

        this.EmbedPlayer = new EmbedPlayer(this);

        this.SkipHandler = new SkipHandler(this);

        this.skipVotingEnabled = defaultSettings.skipVotingEnabled;
        this.skipVotingPassPercentage = defaultSettings.skipVotingPassPercentage;

        this.shoukaku = shoukaku;
        this.audioPlayer = undefined;

        this.recommendSongs = defaultSettings.recommendSongs;
        this.songHistory = [];
        this.youtubeCookies = null;

        this.currentSong = null;
        this.queue = [];
        this.lastSeekEventTime = 0;

        this.lastInvokedChannel = null;
        this.queueLock = false;
        this.audioPlayerStatus = "STOPPED";
        this.repeat = "NONE";
        this.activeVoiceChannel = null;

        this.init();
    }

    async init() {
        try {
            //get audioPlayer from lavalink if available
            const node = await this.shoukaku.getNode();
            if (!node) return;
            this.audioPlayer = await node.players.get(this.controller.guild.id);
            return true;
        } catch (error) {
            logger.log("error", "Error while initializing MusicController: ", error);
            return false;
        }
    }

    triggerUpdate(updateType?: "queueUpdate" | "currentSongUpdate" | "playerStatusUpdate" | "skipVoteUpdate") {
        switch (updateType) {
            case "queueUpdate":
                this.emit("queueUpdate", this.getQueueEvent());

                break;
            case "currentSongUpdate":
                this.emit("currentSongUpdate", this.getCurrentSongUpdateEvent());

                break;
            case "playerStatusUpdate":
                this.emit("playerStatusUpdate", this.getAudioPlayerStatusEvent());

                break;
            case "skipVoteUpdate":
                this.SkipHandler.triggerSkipVoteEvent();

                break;
            default:
                this.emit("queueUpdate", this.getQueueEvent());
                this.emit("currentSongUpdate", this.getCurrentSongUpdateEvent());
                this.emit("playerStatusUpdate", this.getAudioPlayerStatusEvent());
                this.SkipHandler.triggerSkipVoteEvent();
                break;
        }
    }

    applySettings(settings: DbGuildSettings) {
        try {
            if (settings) {
                if ("recommendSongs" in settings) {
                    this.recommendSongs = settings.recommendSongs;
                }
                if ("skipVotingEnabled" in settings) {
                    this.skipVotingEnabled = settings.skipVotingEnabled;
                }
                if ("skipVotingPassPercentage" in settings) {
                    const passPercentage =
                        settings.skipVotingPassPercentage || defaultSettings.skipVotingPassPercentage;
                    const result = this.SkipHandler.setPassPercentage(passPercentage);
                    if (result) {
                        this.skipVotingPassPercentage = passPercentage;
                    }
                }

                //returns true if successful
            }
        } catch (error) {
            console.log("Error while trying to apply settings to Music Controller: ", error);
        }
    }

    getAudioPlayerStatusEvent(): PlayerStatusUpdateEvent {
        return {
            op: "playerStatusUpdate",
            status: this.audioPlayerStatus,
            guildId: this.guild.id,
        };
    }

    changeAudioPlayerStatus(status: AudioPlayerStatus) {
        this.audioPlayerStatus = status;

        this.emit("playerStatusUpdate", this.getAudioPlayerStatusEvent());
    }

    async setVoiceConnection(channel: VoiceBasedChannel) {
        try {
            const node = this.shoukaku.getNode();

            if (channel.id === this.activeVoiceChannel?.id) {
                //already in same channel
                return false;
            }

            await this.stop();

            if (this.audioPlayer) {
                await node.leaveChannel(this.controller.guild.id);
            }
            //If there is audioplayer present we are already connected to voice channel

            this.audioPlayer = await node.joinChannel({
                guildId: this.controller.guild.id,
                channelId: channel.id,
                shardId: this.controller.guild.shardId,
            });

            this.activeVoiceChannel = channel;

            this.audioPlayer.on("start", (data) => {
                this.changeAudioPlayerStatus("PLAYING");

                console.log("audioPlayer started");
            });
            this.audioPlayer.on("end", (data) => {
                if (this.currentSong) {
                    if (this.repeat === "ONE") this.queue.unshift(this.currentSong);
                    if (this.repeat === "ALL") this.queue.push(this.currentSong);
                }

                //reason can be: "FINISHED" | "LOAD_FAILED" | "STOPPED" | "REPLACED" | "CLEANUP";
                const reason = data.reason;
                console.log("audioplayer ended. Reason: ", reason);

                if (this.audioPlayerStatus === "SKIPPING") {
                    if (reason !== "REPLACED") {
                        console.log("reason should be 'REPLACED' reason: " + reason);
                    }
                    this.changeAudioPlayerStatus("STOPPED");
                    return;
                }
                this.changeAudioPlayerStatus("STOPPED");

                if (reason === "LOAD_FAILED" || reason === "FINISHED") {
                    this.playNext();
                }

                if (reason === "STOPPED") {
                    this.stop();
                }

                if (reason === "CLEANUP") {
                    console.log("CLEANUP end event triggered. Don't know why this is happening");
                }
            });

            this.audioPlayer.on("update", (data) => {
                /*
                data = 
                {
                    op: 'playerUpdate',
                    state: { connected: true, position: 45800, time: 1630211312429 },
                    guildId: '854409105431330836'
                }
                */

                this.emit("playerUpdate", data);
            });
            this.audioPlayer.on("resumed", () => {
                console.log("Resumed event triggered: ");

                this.changeAudioPlayerStatus("PLAYING");

                /*
                data = 
                {
              
                }
                */
            });
            this.audioPlayer.on("exception", (data) => {
                try {
                    logger.log("error", "Exception triggered in audioPlayer: ", data);
                    if (this.currentSong) {
                        this.playCommand.reply(
                            '```js\n//Error while processing song.\nname: "' +
                                this.currentSong.info.title +
                                '"\nurl: "' +
                                this.currentSong.info.uri +
                                '"\ntrack_identifier: "' +
                                this.currentSong.info.identifier +
                                '"\nerror: "' +
                                data.exception?.message +
                                '",' +
                                '\ncause: "' +
                                data.exception?.cause +
                                '"' +
                                "```",
                            { required: true }
                        );
                    }

                    this.EmbedPlayer.stop();
                    if (this.audioPlayerStatus !== "STOPPED") {
                        this.playNext();
                    }
                } catch (error) {
                    logger.log("error", "Error while executing exception event: ", error);
                }
                /*
                data = {
                    error: 'Something broke when playing the track.',
                    exception: {
                        severity: 'FAULT', 
                        cause: 'java.io.IOException: Invalid status code for video info response: 410', 
                        message: 'Something broke when playing the track.'
                    },
                    guildId: '861409127225229363',
                    op: 'event',
                    track: 'QAAAigIAHkR5RSAtIEZhbnRhc3kgLSBPZmZpY2lhbCBWaWRlbwASVGlnZXJzdXNoaSBSZWNvcmRzAAAAAAADR9gACzZRRndvNTdXS3dnAAEAK2h0dHBzOi8vd3d3LnlvdXR1YmUuY29tL3dhdGNoP3Y9NlFGd281N1dLd2cAB3lvdXR1YmUAAAAAAAAAAA==',
                    type: 'TrackExceptionEvent'
                }
                */
            });

            this.audioPlayer.on("closed", (data) => {
                if (data instanceof Error || data instanceof Object) logger.log("info", "Audioplayer closed: " + data);

                this.queue.length = 0;
                this.stop();
            });

            return true;
        } catch (error) {
            logger.log("error", "Error while setting voice connection: " + error);
            return false;
        }
    }

    async disconnectFromVoiceChannel() {
        try {
            const node = this.shoukaku.getNode();

            node.leaveChannel(this.controller.guild.id);
            this.activeVoiceChannel = null;
        } catch (error) {
            console.log("Error while executing disconnectFromVoiceChannel: ", error);
        }
    }

    addToQueue(song: QueueTrack | QueueTrack[], forceNext?: boolean) {
        /*
        {
        videoUrl: videoUrl,
        videoId: videoId,
        videoTitle: videoTitle,
        videoThumbnailUrl:videoThumbnailUrl,
        videoDuration: videoDuration
        } 
        */
        if (forceNext) {
            if (Array.isArray(song)) {
                this.queue.unshift(...song);
            } else {
                this.queue.unshift(song);
            }
        } else {
            if (Array.isArray(song)) {
                this.queue.push(...song);
            } else {
                this.queue.push(song);
            }
        }
    }

    async setYoutubeCookies() {
        try {
            //get cookie for reccomendations
            const cookies = await fetch("https://www.youtube.com").then((res) => {
                return res.headers.get("set-cookie");
            });

            this.youtubeCookies = cookies;

            return cookies;
        } catch (error) {
            logger.log("error", "Error while trying to get youtube cookies: ", error);
        }
    }

    findRecommended(song: BotdizTrack) {
        try {
            const trackName = song.info.trackName;
            const artist = song.info.artist;

            if (!(trackName && artist))
                return logger.log("warn", "Can't recommend song - track name or artist is missing");

            const spotifyApi = new SpotifyWebApi({
                clientId: process.env.SPOTIFY_CLIENTID,
                clientSecret: process.env.SPOTIFY_CLIENTSECRET,
            });
        } catch (error) {}
    }

    removeRecommended() {
        const newArray = this.queue.filter((song) => !song.recommendedSong);

        this.updateQueue(newArray);
    }

    async processQueue() {
        this.queueLock = false;
        try {
            if (this.audioPlayerStatus !== "STOPPED") {
                // If the queue is locked (already being processed), or the audio player is already playing something
                this.queueLock = false;

                //remove previous recommended songs
                this.removeRecommended();
            } else {
                // If not playing
                this.queueLock = false;

                //remove previous recommended songs
                this.removeRecommended();

                console.log("playing next");
                this.playNext();
            }

            this.emit("queueUpdate", this.getQueueEvent());

            return "success";
        } catch (error) {
            this.queueLock = false;
            console.log("Error while trying to process queue: ", error);

            return "failed";
        }
    }

    getQueueEvent(): QueueUpdateEvent {
        return {
            op: "queueUpdate",
            queue: this.queue,
            guildId: this.guild.id,
        };
    }

    getCurrentSong() {
        try {
            return this.currentSong;
        } catch (error) {
            return null;
        }
    }

    getCurrentSongUpdateEvent(): CurrentSongUpdateEvent {
        return {
            op: "currentSongUpdate",
            currentSong: this.currentSong,
            guildId: this.guild.id,
        };
    }
    changeCurrentSong(song: BotdizShoukakuTrack | null) {
        try {
            this.currentSong = song;
            this.emit("currentSongUpdate", this.getCurrentSongUpdateEvent());

            //if current song changes queue always changes
            this.emit("queueUpdate", this.getQueueEvent());
        } catch (error) {
            logger.log("error", "Error while running updateCurrentSong() Error: " + error);
        }
    }

    updateQueue(queue: QueueTrack[]) {
        try {
            this.queue = queue;
            this.emit("queueUpdate", this.getQueueEvent());

            return "success";
        } catch (error) {
            console.log("Error while running updateQueue() Error: ", error);

            return "failed";
        }
    }

    clearQueue() {
        try {
            this.queue = [];
            this.emit("queueUpdate", this.getQueueEvent());
        } catch (error) {
            logger.log("error", "Error while running clearQueue() Error: " + error);
        }
    }

    deleteQueueItem(index: number) {
        try {
            this.queue.splice(index, 1);
            this.emit("queueUpdate", this.getQueueEvent());

            return true;
        } catch (error) {
            logger.log("error", "Error while running deleteQueueItem() Error: " + error);
            return false;
        }
    }

    async playNext() {
        try {
            this.SkipHandler.endVote();
            const nextSong = await this.processNextSong();

            if (!nextSong) {
                //no song is next
                //this.playCommand.reply("`No songs left in queue, feel free to add new ones.`")
                this.stop();

                return false;
            }

            if (!this.audioPlayer) {
                await this.init();
            }
            //console.log("Got resources")
            if (this.audioPlayer) {
                this.changeCurrentSong(nextSong);

                await this.audioPlayer.playTrack(nextSong, {
                    noReplace: false,
                });
            } else {
                logger.log("error", "No audio player available /MusicController/playNext()");

                this.stop();

                return false;
            }

            /**
             * Creates a message that shows song info then assigns an updater.
             */
            await this.createSongEmbed(nextSong);
            return "success";
        } catch (error) {
            logger.log("error", "Error occured while trying to create Audio Resource.", error);
            //console.log("trying next")
            //this.playNext()
            return;
        }
    }

    async processNextSong(): Promise<BotdizShoukakuTrack | null> {
        try {
            if (this.queue.length === 1 && this.recommendSongs) {
                //last queue song time to recommend song
                console.log("this is the last song");
                const lastSong = this.queue[0];
                const recommendedList = await getRecommended(lastSong);

                if (recommendedList) {
                    this.addToQueue(recommendedList);
                }
            }
            let nextInQueue = this.queue.shift();
            let processedSong;

            if (!nextInQueue) {
                return null;
            }

            const nextIsBotdizTrack = nextInQueue as BotdizTrack;
            const nextIsYoutubeRecommended = nextInQueue as YoutubeRecommended;
            if (nextIsBotdizTrack.isSpotify) {
                //if came from spotify link
                //only videoArtist, videoTitle, isSpotify present
                //turn into Shoukaku Track

                const query = nextIsBotdizTrack.info.title;
                const node = this.shoukaku.getNode();

                const result = await node.rest.resolve(query, "youtube");

                if (!result.tracks.length) {
                    //couldn't find song from spotify song
                    return null;
                }

                processedSong = result.tracks.shift() as BotdizShoukakuTrack;
            } else if (nextInQueue instanceof ShoukakuTrack) {
                processedSong = nextInQueue;
            } else if (nextIsYoutubeRecommended.isYoutubeRecommended) {
                const query = nextIsYoutubeRecommended.info.title;
                const node = this.shoukaku.getNode();

                const result = await node.rest.resolve(query, "youtube");

                if (!result.tracks.length) {
                    //couldn't find song from spotify song
                    return null;
                }

                processedSong = result.tracks.shift() as BotdizShoukakuTrack;
            } else {
                console.log(
                    "Couldn't figure out how to process next song. FIX ME!! Might be a ShoukakuTrack also, who knows..."
                );
                //bug here with adding "deep end foushee" from interface

                console.log("Track is : ", nextInQueue);

                this.queueLock = false;
            }

            if (processedSong) {
                if (processedSong.info.sourceName === "youtube") {
                    const oembed = "https://www.youtube.com/oembed?url=";
                    const oEmbedUrl = oembed + processedSong.info.uri;

                    const videoThumbnailUrl = await fetch(oEmbedUrl)
                        .then((res) => res.json())
                        .then((parsedRes) => parsedRes.thumbnail_url)
                        .catch((err) => {
                            console.log("Error while fetching oEmbed. error: ", err);
                            return null;
                        });

                    processedSong.thumbnail = videoThumbnailUrl;
                }

                this.queueLock = false;

                return processedSong;
            } else {
                logger.log("error", "Error while trying to process next song. processSong is " + processedSong);

                return null;
            }
            //add thumbnail image if youtube
        } catch (error) {
            logger.log("error", "Error in processNextSong()", error);
            this.queueLock = false;

            return null;
        }
    }

    async createSongEmbed(currentSong: BotdizShoukakuTrack, invokedMessage?: CommandInteraction | null) {
        try {
            let botMessage;
            const botdizLinkButton = new MessageActionRow();
            const botdizLink =
                process.env.NODE_ENV === "development"
                    ? "http://localhost:3000/app"
                    : "https://botdiz.kaansarkaya.com/app";
            botdizLinkButton.addComponents(
                new MessageButton().setLabel("Botdiz Interface").setStyle("LINK").setURL(botdizLink)
            );
            let embedMessage = new MessageEmbed();

            embedMessage
                .setColor(this.controller.roleColor)
                .addField("Now Playing: ", `${currentSong.info.title}`)
                .setTimestamp();

            if (currentSong.thumbnail) {
                embedMessage = embedMessage.setThumbnail(currentSong.thumbnail);
            }

            //await this.playCommand.reply( { content: "ヾ(⌒ー⌒)ノ", ephemeral: true }, {required: false})
            if (invokedMessage) {
                this.playCommand.lastInvokedMessage = invokedMessage;
                if (invokedMessage instanceof CommandInteraction) {
                    this.playCommand.lastIsInteraction = true;
                }
            }

            botMessage = await this.playCommand.reply(
                { embeds: [embedMessage], components: [botdizLinkButton] },
                { new: true, required: true }
            );

            if (!botMessage) return;
            if (botMessage instanceof Message) {
                if (this.EmbedPlayer.quit) {
                    this.EmbedPlayer.start();
                }

                this.EmbedPlayer.changeSong(currentSong);
                this.EmbedPlayer.changeMessage(botMessage);

                return true;
            } else {
                throw new Error("Unexpected type for botMessage: " + botMessage);
            }

            /* 
            if(lastMessage.author.bot) {
                lastMessage.edit(embedMessage).then( message => {
                    botMessage = message
                    const originalVideoTitle = nextInQueue.videoTitle;
                    
                    updatePlayer(this, invokedMessage, nextInQueue, botMessage)
                    
                    return true
                }).catch(err=>{console.log("Error while executing manageSongEmbed() / edit embed"), err})
            }
            */
        } catch (error) {
            console.log("Error while trying to create song embed: " + error);

            return;
        }
    }

    async seekTo(timeInMs: number) {
        try {
            if (this.lastSeekEventTime + 1000 > Date.now()) {
                console.log("too soon");
                return "failed";
            } else if (this.audioPlayer) {
                this.audioPlayer.seekTo(timeInMs);
                this.lastSeekEventTime = Date.now();
                return "success";
            }
            return "failed";
        } catch (error) {
            logger.log("error", "Error while running seekTo() Error: " + error);
            return "failed";
        }
    }

    async skip(skipAmount: number) {
        if (this.audioPlayerStatus === "SKIPPING") {
            logger.log("info", "Already skipping!");
            return;
        }

        this.changeAudioPlayerStatus("SKIPPING");
        for (let i = 1; i < skipAmount; i++) {
            this.queue.shift();
        }

        this.queueLock = false;
        const result = await this.playNext();
        return result;
    }

    async shuffleQueue() {
        try {
            console.log("Shuffling queue");
            if (this.queue && this.queue.length > 1) {
                //https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
                for (let i = this.queue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
                }

                this.emit("queueUpdate", this.getQueueEvent());
                return true;
            } else {
                console.log("not enough songs in queue to shuffle");
                return true;
            }
        } catch (error) {
            logger.log("error", "Error while trying to shuffle queue", error);
            return false;
        }
    }

    async stop() {
        try {
            this.changeAudioPlayerStatus("STOPPED");

            this.clearQueue();
            this.changeCurrentSong(null);
            this.songHistory = [];
            //logger.log("info", "Queue cleared")

            if (this.audioPlayer) {
                await this.audioPlayer.stopTrack();
                //logger.log("info", "Audio Player stopped.")
            }

            this.EmbedPlayer.stop();
            //logger.log("info", "Player updater stopped")
            this.SkipHandler.endVote();

            this.queueLock = false;

            return;
            //this.voiceConnection.destroy();
            //logger.log("info", "Voice connection destroyed.")

            //this.controller.MusicController = null
            //logger.log("info", "Music Controller destroyed")

            //logger.log("info", "Stopped music player and destroyed MusicController")
        } catch (error) {
            logger.log("error", "Error while running MusicController.stop(): ", error);
        }
    }
    pause() {
        try {
            if (this.audioPlayer) {
                console.log("pausing player");

                this.audioPlayer.setPaused(true);
                this.changeAudioPlayerStatus("PAUSED");
            } else {
                logger.log("warn", "no player to pause");
            }
        } catch (error) {
            logger.log("info", "Error while running pause(): " + error);
        }
    }
    resume() {
        try {
            if (this.audioPlayer) {
                console.log("resuming player");

                this.audioPlayer.setPaused(false);
                this.changeAudioPlayerStatus("PLAYING");
            } else {
                logger.log("warn", "no player to resume");
            }
        } catch (error) {
            logger.log("info", "Error while trying to resume.", error);
        }
    }
}
