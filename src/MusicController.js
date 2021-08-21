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

const commands = require('./botCommands')
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

        this.currentSong;
        this.queue = [];
	
    }

    setVoiceConnection(VoiceConnection) {
        
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Stop,
                maxMissedFrames: Math.round(5000 / 20)
            }
        })

        this.voiceConnection = VoiceConnection
        this.voiceConnection.subscribe(this.audioPlayer);
        

        this.voiceConnection.once('stateChange', async (_, newState) => {
            this.voiceConnectionState = newState.status
            
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                    
					/*
						If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
						but there is a chance the connection will recover itself if the reason of the disconnect was due to
						switching voice channels. This is also the same code for the bot being kicked from the voice channel,
						so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
						the voice connection.
					*/
					try {
						await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5000);
						// Probably moved voice channel
					} catch {
						this.voiceConnection.destroy();
						// Probably removed from voice channel
					}
				} else if (this.voiceConnection.reconnectAttempts < 5) {
                    
					/*
						The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
					*/

                    await new Promise(resolve => setTimeout(resolve, this.voiceConnection.reconnectAttempts + 1) * 5000)

                    logger.log("error", `Voice connection encountered error. Trying to connect again. Attempt ${this.voiceConnection.reconnectAttempts} / 5`)
					this.voiceConnection.reconnect();
				} else {
                    
					/*
						The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					*/
                    logger.log("error", `Couldn't reconnect. Destroying voice connection.`)
					this.voiceConnection.destroy();
				}
			} else if (newState.status === VoiceConnectionStatus.Destroyed) {
                
				/*
					Once destroyed, stop the controller
				*/
				this.stop();
			} else if (
				!this.readyLock &&
				(newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
			) {
                
				/*
					In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
					before destroying the voice connection. This stops the voice connection permanently existing in one of these
					states.
				*/
                
				this.readyLock = true;
				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20000);
				} catch {
					if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
				} finally {
					this.readyLock = false;
				}
			}
		});

        // Configure audio player
		this.audioPlayer.on('stateChange', (oldState, newState) => {
            this.audioPlayerStatus = newState.status
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle && !this.skipping) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.

                
                //logger.log("info","Playing to idle state triggered.")
                if(this.stopping) {
                    this.queue = [];
                }
                if(this.queue.length > 0) {
                    //logger.log("info", "Playing next in queue.")
                    void this.playNext();
                } else {
                    //logger.log("info","Nothing left in queue.")
                    this.command.reply("Stopping player 🛑", {new: true})
                    this.stop()
                    this.stopping = false;
                    return
                }


                


			} else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                //console.log("Now playing!!!")
			}
		});

		this.audioPlayer.on('error', (error) => {
            try {
                const fs = require('fs')

                fs.writeFile('./audioPlayerErrorLog.txt', error)
                logger.log("error", "Audio player error: ", error.stack)
            } catch (error) {
                
            }
        });

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

    async processQueue() {

        if(!this.audioPlayer) {
            console.log("no audio player available")
            this.queue = []
            this.queueLock = false
            return "failed"
        }
        // If the queue is locked (already being processed), or the audio player is already playing something, return
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
            
            this.queueLock = false
			return "success";
		} else if (this.audioPlayer.state.status == AudioPlayerStatus.Idle){
            this.queueLock = false
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
   
        const spawnAudioResource = require("./scripts/spawnAudioResource_ytdl_exec")
        
        try {
            //logger.log("info", "Trying to create Audio Resource." )    
            const resource = await spawnAudioResource(nextInQueue);
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
            throw new Error("Error while trying to create Audio Resource")
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
            //logger.log("info", "Queue cleared")
            
            if(this.audioPlayer) {
                this.audioPlayer.stop(true)
                //logger.log("info", "Audio Player stopped.")
            }
            
            
            this.UpdatePlayerInfo.stop()
            //logger.log("info", "Player updater stopped")
            
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