const fs = require('fs')
const { default: fetch } = require('node-fetch');

const { logger } = require("../../logger")

const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js")


//const ytdl = require("ytdl-core");
//const prism = require('prism-media')
const EmbedPlayer = require('./EmbedPlayer')
const SkipHandler = require('./SkipHandler')
const commands = require('../../botCommands');


let playCommand;
for (const command of commands()) {
    if(command.name === 'play') {
        playCommand = command
    }
}

const defaultSettings = {
    autoplay: false,
    skipVotingEnabled: false,
    skipVotingPassPercentage: 0.5
}

module.exports = class MusicController {
    constructor(controller, shoukaku) {
        this.controller = controller;
        this.guild = controller.guild
        this.volume = 1
        this.command = playCommand;
        this.readyLock = false;
        this.UPDATE_INTERVAL = 10000 // player stats update interval in ms

        this.EmbedPlayer = new EmbedPlayer(this)
        this.EmbedPlayer.start()
        
        this.SkipHandler = new SkipHandler(this)
        this.skipVotingEnabled = defaultSettings.skipVotingEnabled
        this.skipVotingPassPercentage = defaultSettings.skipVotingPassPercentage
        
        this.lastInvokedMessage;

        this.shoukaku = shoukaku
        this.audioPlayer = null

        this.autoplay = defaultSettings.autoplay
        this.songHistory = []
        this.youtubeCookies = null

        this.currentSong;
        this.queue = [];

        this.init()
    }

    async init() {
        try {
            //get audioPlayer from lavalink if available
            const node = this.shoukaku.getNode()
            this.audioPlayer = node.players.get(this.controller.guild.id)
            
        } catch (error) {
            
        }

    }

    applySettings(settings) {
        try {
            if(settings) {
                if("autoplay" in settings) {
                    this.autoplay = settings.autoplay
                }
                if("skipVotingEnabled" in settings) {
                    this.skipVotingEnabled = settings.skipVotingEnabled
                }
                if("skipVotingPassPercentage" in settings) {
                    const passPercentage = settings.skipVotingPassPercentage || defaultSettings.skipVotingPassPercentage
                    const result = this.SkipHandler.setPassPercentage(passPercentage)
                    if(result) {
                        this.skipVotingPassPercentage = passPercentage
                    }

                }

                //returns true if successful
            }
            
        } catch (error) {
            console.log("Error while trying to apply settings to Music Controller: ", error)
        }
    }

    async setVoiceConnection(channel) {
        const node = this.shoukaku.getNode()

        if (channel.id === this.activeVoiceChannel?.id) {
            //already in same channel
            return
        }
        
        await this.stop()

        if (this.audioPlayer) {
            await node.leaveChannel(this.controller.guild.id)
        }
        //If there is audioplayer present we are already connected to voice channel

        this.audioPlayer = await node.joinChannel({
            guildId: this.controller.guild.id,
            channelId: channel.id,
            shardId: this.controller.guild.shardId
        });


        this.activeVoiceChannel = channel

        this.audioPlayer.on('start', () => {
            if (this.repeat === 'one') return;
            this.audioPlayer.playing = true
            this.audioPlayerStatus = "playing"
            this.stopped = false;

            console.log("audioPlayer started")
        });
        this.audioPlayer.on('end', () => {
            if (this.repeat === 'one') this.queue.unshift(this.current);
            if (this.repeat === 'all') this.queue.push(this.current);
            this.audioPlayer.playing = false
            this.audioPlayerStatus = "stopped"
            console.log("audioplayer ended")

            if(!this.stopped && !this.skipping) {
                this.playNext();
            }
            if (this.skipping) {
                //end triggered because of skip command, ignore play next
                this.skipping=false
            }
        });

        this.audioPlayer.on('update', (data) => {
            /*
            data = 
            {
                op: 'playerUpdate',
                state: { connected: true, position: 45800, time: 1630211312429 },
                guildId: '854409105431330836'
            }
            */
        })
        for (const event of ['closed', 'error']) {
            this.audioPlayer.on(event, data => {
                if (data instanceof Error || data instanceof Object) console.error(data);
                this.audioPlayer.playing = false
                this.audioPlayerStatus = "stopped"

                this.queue.length = 0;
                this.stop();
            });
        }
    }

    async disconnectFromVoiceChannel() {
        try {
            const node = this.shoukaku.getNode()

            node.leaveChannel(this.controller.guild.id)
            this.activeVoiceChannel = null

        } catch (error) {
            console.log("Error while executing disconnectFromVoiceChannel: ", error)
        }
    }

    addToQueue(song, options) {
        /*
        {
        videoUrl: videoUrl,
        videoId: videoId,
        videoTitle: videoTitle,
        videoThumbnailUrl:videoThumbnailUrl,
        videoDuration: videoDuration
        } 
        */
        if (options?.forceNext) {
            this.queue.unshift(song)
        } else {
            this.queue.push(song) 
        }
            
        
    }

    async setYoutubeCookies() {
        try {
            //get cookie for reccomendations
            const cookies = await fetch("https://www.youtube.com")
            .then(res => {
                return res.headers.get("set-cookie")
            })
        
            this.youtubeCookies = cookies
            
            return cookies
        } catch (error) {
            logger.log("error", "Error while trying to get youtube cookies: ", error)
        }

    }

    async processQueue() {
        this.queueLock = false

        if(!this.audioPlayer) {
            console.log("no audio player available")
            this.queue = []
            this.queueLock = false
            return "failed"
        }
        // If the queue is locked (already being processed), or the audio player is already playing something, return
        if (this.queueLock || this.audioPlayer.playing) {

            //remove previous recommended songs
            for (const [index, song] of this.queue.entries()) {
                if (song.recommendedSong) {
                    this.queue.splice(index, 1)
                }
            }

            this.queueLock = false
			return "success";
        // If not playing
		} else if (!this.audioPlayer.playing){
            this.queueLock = false

            //remove previous recommended songs
            for (const [index, song] of this.queue.entries()) {
                if (song.recommendedSong) {
                    console.log("this shouldn't trigger. music controller recommended remover. line:223")
                    this.queue.splice(index, 1)
                }
            } 

            console.log("playing next")
            this.playNext();

            return "success"
        }
        
    }
    
    
    getCurrentSong() {
     
        try {
            return this.currentSong;
        } catch (error) {
            //if there is no current song
            return false
        }
            
      
    }

    updateCurrentSong(song) {
        try {
            this.currentSong = song
             
        } catch (error) {
            logger.log("error", "Error while running updateCurrentSong() Error: " + error)
        }
    }

    clearQueue() {
        try {
            this.queue = []
        } catch (error) {
            logger.log("error", "Error while running clearQueue() Error: " + error)
        }
    }
    
    async playNext() {
        try {
            this.SkipHandler.endVote()
            const nextInQueue = await this.processNextSong()

            if (!nextInQueue) {
                //no song is next
                this.command.reply("`No songs left in queue, feel free to add new ones.`", {new: true})

                this.stop()
                
                return false
            }

            
            console.log(nextInQueue.info)
            //console.log("Got resources")
            
            this.currentSong = nextInQueue
            await this.audioPlayer.playTrack(nextInQueue, { noReplace: false }); 
            
            
            /**
             * Creates a message that shows song info then assigns an updater.
             */       
            await this.createSongEmbed(nextInQueue)
            return "success"
            
        } catch (error) {
            logger.log("error", "Error occured while trying to create Audio Resource.", error )  
            //console.log("trying next")
            //this.playNext()
            return 
            
        }
    }

    /**
     * 
     * @returns ShoukakuTrack 
     */
    async processNextSong() {
        try {
            //console.log(self)
            
            let nextInQueue = this.queue.shift();
            
            if (!nextInQueue) {
            

                return false
            }

            if (nextInQueue.constructor.name === "ShoukakuTrack") {
                console.log("Track is Shoukaku Track")


            } else if (nextInQueue.isSpotify) {
                //if came from spotify link
                //only videoArtist, videoTitle, isSpotify present
                //turn into Shoukaku Track
    
                const query = nextInQueue.info.title
                const node = this.shoukaku.getNode()

                const result = await node.rest.resolve(query, 'youtube')

                if (!result.tracks.length) {
                    //couldn't find song from spotify song
                    return false
                }
                
                nextInQueue = result.tracks.shift();


            } else {
                console.log("Couldn't figure out how to process next song. FIX ME!! ")
                
                console.log("Track is : ", nextInQueue)
                
                this.queueLock = false
                
                return false
            }

            //add thumbnail image if youtube
            if(nextInQueue.info.sourceName === 'youtube') {
                const oembed = "https://www.youtube.com/oembed?url="
                const oEmbedUrl = oembed + nextInQueue.info.uri

                const videoThumbnailUrl = 
                    await fetch(oEmbedUrl)
                        .then((res) => res.json())
                        .then((parsedRes) => parsedRes.thumbnail_url)
                        .catch(err=> {
                            console.log("Error while fetching oEmbed. error: ", err)
                            return null
                        })

                nextInQueue.info.thumbnail = videoThumbnailUrl
            }

            this.queueLock = false
            
            return nextInQueue
            
        } catch (error) {
            logger.log("error", "Error in processNextSong()", error)
            this.queueLock = false

            return false
        }
        
    }

    async createSongEmbed(currentSong) {
        try {
            
            let botMessage;
            const botdizLinkButton = new MessageActionRow()
            const botdizLink = process.env.NODE_ENV === "development" ? "http://localhost:3000/app" : "https://botdiz.kaansarkaya.com/app"
            botdizLinkButton
                .addComponents(
                    new MessageButton()
                        .setLabel("Botdiz Interface")
                        .setStyle("LINK")
                        .setURL(botdizLink)
                )
            let embedMessage = new MessageEmbed()
            
            embedMessage
                .setColor(this.controller.roleColor)
                .addField("Now Playing: ",`${currentSong.info.title}`)
                .setTimestamp()
    
    
            if(currentSong.info.thumbnail) {
                embedMessage = embedMessage
                    .setThumbnail(currentSong.info.thumbnail)
            }
            
            //await this.command.reply( { content: "ヾ(⌒ー⌒)ノ", ephemeral: true }, {required: false})
            botMessage = await this.command.reply( { embeds: [embedMessage], components: [botdizLinkButton]}, { new:true, required: true })
            
    
            if (this.EmbedPlayer.quit) {
                this.EmbedPlayer.start()
            }
            this.EmbedPlayer.changeSong(currentSong) 
            this.EmbedPlayer.changeMessage(botMessage) 
    
            return true
    
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
            console.log("Error while trying to create song embed: " + error)

            return
        }
        
        
    }

    async skip(skipAmount) {
        
        this.skipping = true
        for (let i = 1; i < skipAmount; i++) {
            this.queue.shift()
        }

        const result = await this.playNext()
        this.queueLock = false
        return result


    }
    
    async stop() {
        try {
            this.stopped = true;
            
            this.clearQueue()
            this.currentSong = null;
            this.songHistory = []
            //logger.log("info", "Queue cleared")
            
            if(this.audioPlayer) {
                await this.audioPlayer.stopTrack()
                //logger.log("info", "Audio Player stopped.")
            }
            
            
            await this.EmbedPlayer.stop()
            //logger.log("info", "Player updater stopped")
            this.SkipHandler.endVote()


            this.queueLock = false;

            return
            //this.voiceConnection.destroy();
            //logger.log("info", "Voice connection destroyed.")

            //this.controller.MusicController = null
            //logger.log("info", "Music Controller destroyed")

            //logger.log("info", "Stopped music player and destroyed MusicController")
        } catch (error) {
            logger.log("error","Error while running MusicController.stop().", error)
        }
    }
    pause() {
        
        try {
                console.log("pausing player")
                
                this.audioPlayer.setPaused(true)
                this.audioPlayerStatus = "paused"
            
        } catch (error) {
            logger.log("info", "No dispatcher at present.", this.dispatcher, error)
        }
    }
    resume() {

        
        try {
            console.log("resuming player")

                this.audioPlayer.setPaused(false)
                this.audioPlayerStatus = "playing"

            
        } catch (error) {
            logger.log("info", "Error while trying to resume.", error)
        }
    }
}