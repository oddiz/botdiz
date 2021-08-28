const fs = require('fs')
const { default: fetch } = require('node-fetch');

const { logger } = require("./logger")
const searchYT = require("./scripts/searchYT")

const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js")

const {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
    createAudioResource,
    StreamType,
    demuxProbe,
    NoSubscriberBehavior
} = require('@discordjs/voice');
//const ytdl = require("ytdl-core");
//const prism = require('prism-media')
const UpdatePlayerInfo = require('./UpdatePlayerInfo')

const commands = require('./botCommands');
let playCommand;
for (const command of commands()) {
    if(command.name === 'play') {
        playCommand = command
    }
}
module.exports = class MusicController {
    constructor(controller) {
        this.controller = controller;
        this.volume = 1
        this.command = playCommand;
        this.readyLock = false;
        this.UPDATE_INTERVAL = 5000 // player stats update interval in ms
        this.UpdatePlayerInfo = new UpdatePlayerInfo(this)
        this.UpdatePlayerInfo.start()
        this.lastInvokedMessage;

        this.audioPlayer = null
        this.audioPlayerStatus;

        this.voiceConnection; 
        this.voiceConnectionState;

        this.autoplay = false
        this.songHistory = []
        this.youtubeCookies = null

        this.currentSong;
        this.queue = [];

        this.deleteAudioBuffer();
	
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

        this.setYoutubeCookies()
        if(!this.audioPlayer) {
            console.log("no audio player available")
            this.queue = []
            this.queueLock = false
            return "failed"
        }
        // If the queue is locked (already being processed), or the audio player is already playing something, return
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {

            //remove previous recommended songs
            for (const [index, song] of this.queue.entries()) {
                if (song.recommendedSong) {
                    this.queue.splice(index, 1)
                }
            }

            this.queueLock = false
			return "success";
		} else if (this.audioPlayer.state.status == AudioPlayerStatus.Idle){
            this.queueLock = false

            //remove previous recommended songs
            for (const [index, song] of this.queue.entries()) {
                if (song.recommendedSong) {
                    console.log("this shouldn't trigger. music controller recommended remover. line:223")
                    this.queue.splice(index, 1)
                }
            } 
            const result = await this.playNext();

            return result
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
        const nextInQueue = await this.processNextSong()

        
        if (!nextInQueue) {
            //no song is next
            
            return
        }

        //wait a few moments so player doesn't skuff
        await new Promise(resolve => setTimeout(resolve, 200));

        
        
        /**
         * Create a player and play the song
         */
        const spawnAudioResource = require("./scripts/spawnAudioResource")
        //const spawnAudioResource = require("./scripts/spawnAudioResource_ytdl_exec")
        
        try {

            
            //logger.log("info", "Trying to create Audio Resource." )    
            const resource = await spawnAudioResource(nextInQueue, this.controller);
            //console.log("Got resources")
            await this.audioPlayer.play(resource, { volume: MusicController.volume }); 
            
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

    processNextSong() {
        return new Promise((resolve, reject) => {
            
            try {
                //console.log(self)
                if (this.queue.length === 0) {
                    this.command.reply("Stopping player 🛑", {new: true})
    
                    this.stop()
                    
                    resolve(false)

                    return
                }   
                let nextInQueue = this.queue[0];
                
                if (!nextInQueue) {
                    resolve(false)

                    return
                }
                this.queueLock = true
                if (nextInQueue.isSpotify) {
                    //if came from spotify link
                    //only videoArtist, videoTitle, isSpotify present
                    const getInfoFromYoutubeUrl = require("./scripts/getInfoFromYoutubeUrl")
        
                    const query = nextInQueue.videoTitle
                    
                    searchYT(query, 1, (result) => {
                                                
                        if (result) {
                            //invokedMessage.channel.send("Video found: " + result.videoUrl)
                            getInfoFromYoutubeUrl(result.videoUrl, result => {
                                nextInQueue = result;
                                this.updateCurrentSong(nextInQueue);
                                
                                this.queueLock = false
                                this.queue.shift()
    
                                resolve(nextInQueue)
                            })
        
                        } else {
                            console.error("Error getting YT info from: "+ query)
                            console.error("Error from music COntroller play next()")
                        }
                    })
        
                } else {
                    this.queueLock = false
                    this.updateCurrentSong(nextInQueue);
                    this.queue.shift()
                    resolve(nextInQueue)
                }
            } catch (error) {
                logger.log("error", "Error in processNextSong()", error)
                reject(error)
            }
        
        
        
        
        
        
        
        })
            
        



            logger.log("error", "ERROR while processing the queue.")
            
            return false
        
    }

    async createSongEmbed(currentSong) {
        
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
            .addField("Now Playing: ",`${currentSong.videoTitle}`)
            .setTimestamp()


        if(currentSong.videoThumbnailUrl) {
            embedMessage = embedMessage
                .setThumbnail(currentSong.videoThumbnailUrl)
        }
        
        //await this.command.reply( { content: "ヾ(⌒ー⌒)ノ", ephemeral: true }, {required: false})
        botMessage = await this.command.reply( { embeds: [embedMessage], components: [botdizLinkButton]}, { new:true, required: true })
        

        if (this.UpdatePlayerInfo.quit) {
            this.UpdatePlayerInfo.start()
        }
        this.UpdatePlayerInfo.changeSong(currentSong) 
        this.UpdatePlayerInfo.changeMessage(botMessage) 

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
        
        
    }

    async deleteAudioBuffer() {
        try {
            //delete audio buffer
            fs.unlink(`./temp/AudioBuffers/${this.controller.guild.id}`, (err) => {
                
            })
            
        } catch (error) {
            console.log("Error while trying to delete buffer file  :\n", error)
        }
    }

    async skip(skipAmount) {
        
        this.skipping = true
        for (let i = 1; i < skipAmount; i++) {
            this.queue.shift()
        }

        const result = await this.playNext()
        this.skipping = false
        this.queueLock = false
        return result



        if (this.queue.length == 0){
            this.command.reply("No playlist to skip ⚠")
            return
        }
        
        if (skipAmount > this.controller.MusicController.queue.length) {
            skipAmount = this.controller.MusicController.queue.length
        }

        if (!skipAmount || skipAmount === 1){
            this.command.reply(`Skipping ${this.getCurrentSong.videoTitle}`)
            
            this.playNext()

        } else {
            for (let i = 1; i < skipAmount; i++) {
                this.queue.shift()
            }
            this.command.reply(`Skipping ${skipAmount} songs`)
            this.playNext()
        }
    }
    
    stop() {
        try {
            this.stopping = true;
            
            this.clearQueue()
            this.currentSong = null;
            this.songHistory = []
            //logger.log("info", "Queue cleared")
            
            if(this.audioPlayer) {
                this.audioPlayer.stop(true)
                //logger.log("info", "Audio Player stopped.")
            }
            
            
            this.UpdatePlayerInfo.stop()
            //logger.log("info", "Player updater stopped")
            
            //delete audio buffer file
            this.deleteAudioBuffer()

            this.queueLock = false;
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
            
                this.audioPlayer.pause()
            
        } catch (error) {
            logger.log("info", "No dispatcher at present.", this.dispatcher, error)
        }
    }
    resume() {

        
        try {
           
                this.audioPlayer.unpause()
            
        } catch (error) {
            logger.log("info", "Error while trying to resume.", error)
        }
    }
}