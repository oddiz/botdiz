const { logger } = require("./logger")
const searchYT = require("./scripts/searchYT")
const updatePlayer = require("./scripts/updatePlayer")
const { MessageEmbed } = require("discord.js")

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
const ytdl = require("ytdl-core");
const prism = require('prism-media')
const UpdatePlayerInfo = require('./UpdatePlayerInfo')
module.exports = class MusicController {
    constructor(controller, Command, voiceConnection) {
        this.controller = controller;
        this.volume = 1
        this.command = Command
        this.readyLock = false;
        this.UPDATE_INTERVAL = 2000 // player stats update interval in ms
        this.UpdatePlayerInfo = new UpdatePlayerInfo(this)
        this.UpdatePlayerInfo.start()
        this.lastInvokedMessage;

        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Stop,
                maxMissedFrames: Math.round(5000 / 20)
            }
        })
        this.voiceConnection = voiceConnection; 
        
        this.queue = [];

        voiceConnection.subscribe(this.audioPlayer);
        
        this.voiceConnection.on('stateChange', async (_, newState) => {
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
					await wait((this.voiceConnection.reconnectAttempts + 1) * 5000);
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
			if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
				// If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
				// The queue is then processed to start playing the next track, if one is available.

                console.log("Playing to idle state change. Trying next in queue")
                this.queue.shift()
				void this.processQueue(this.command.lastInvokedMessage);


			} else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                console.log("Now playing!!!")
			}
		});

		this.audioPlayer.on('error', (error) => console.log("On error error:", error));

	
    }

    download(invokedMessage, videoId){
        const YtMp3Downloader = require("youtube-mp3-downloader")
        
        const config = require("./config.json");

        const YD = new YtMp3Downloader({
            "ffmpegPath": config.ffmpegPath,        // FFmpeg binary location
            "outputPath": "./temp",    // Output file location (default: the home directory)
            "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
            "queueParallelism": 10,                  // Download parallelism (default: 1)
            "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
            "allowWebm": false                      // Enable download from WebM sources (default: false)
        });

        YD.download(videoId, videoId+".mp3");

        YD.on("finished", (err, data)=>{
            logger.log("info", "Download finished")
            logger.log("info", JSON.stringify(data))
            this.addToQueue(data, invokedMessage)
            this.play(invokedMessage)
        })

        YD.on("progress", (progress => {
            logger.log("info", JSON.stringify(progress))
        }))
    }

    addToQueue(song) {
        /*
        {
        videoUrl: videoUrl,
        videoId: videoId,
        videoTitle: videoTitle,
        videoThumbnailUrl:videoThumbnailUrl,
        videoDuration: videoDuration
        } 
        */
            
            this.queue.push(song) 
            
    }

    async processQueue(invokedMessage) {
        // If the queue is locked (already being processed), or the audio player is already playing something, return
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
            this.command.reply("Added to queue")
			return;
		} else if (this.queue.length === 0){
            this.command.reply("Queue ended, stopping player 🛑", {followup:true})

            this.stop()

            return
        }
        this.queueLock = true;
        this.invokedMessage = invokedMessage
        this.playNext(invokedMessage);
        
        this.queueLock = false;
    }
    
    
    getCurrentSong() {
        try {
            if (this.queue.length > 0){
                //console.log("CURRENT SONG IS: " + JSON.stringify(this.queue[0]))
                return this.queue[0]
            } else {
                //console.log("NO SONGS IN THE QUEUE")

                return false
            }
            
        } catch (error) {
            logger.log("error", "Error while running getCurrentSong() Error: " + error)
        }
    }

    updateCurrentSong(song) {
        try {
            if (this.queue.length > 0) {
                //console.log("UPDATED CURRENT FROM TO: "+ JSON.stringify(this.queue[0]))
                this.queue[0] = song
                //console.log("UPDATED CURRENT SONG TO: "+ JSON.stringify(song))
            } else {
                //console.log("NO SONGS IN THE QUEUE.")
            }
             
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

    async processNextSong() {
        try {
            //console.log(self)
            if (this.queue.length === 0) {
                
            }   
            let nextInQueue = this.getCurrentSong();
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
                            this.updateCurrentSong(result);
                            nextInQueue = this.getCurrentSong();
                            
                            this.queueLock = false
                            return nextInQueue
                        })
    
                    } else {
                        console.error("Error getting YT info from: "+ query)
                        console.error("Error from music COntroller play next()")
                    }
                })
    
            } else {
                this.queueLock = false
                
                return nextInQueue
            }
            
        } catch (error) {
            logger.log("error", "ERROR while processing the queue.")
            
            return false
        }
    }

    async createSongEmbed(invokedMessage, currentSong) {
        
        let botMessage;
        
        let embedMessage = new MessageEmbed()
        
        embedMessage
            .setColor("#e9b463")
            .addField("Now Playing: ",`${currentSong.videoTitle}`)
            .setTimestamp()


        if(currentSong.videoThumbnailUrl) {
            embedMessage = embedMessage
                .setThumbnail(currentSong.videoThumbnailUrl)
        }
        
            
        await this.command.reply( { embeds: [embedMessage]})
        
        
        botMessage = invokedMessage
        const originalVideoTitle = this.getCurrentSong().videoTitle;
        
        this.UpdatePlayerInfo.changeMessage(invokedMessage) 
        this.UpdatePlayerInfo.changeSong(currentSong) 

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

    async playNext(invokedMessage) {
        const self = this

        if (invokedMessage.type === "APPLICATION_COMMAND") {
            
        }

        const nextInQueue = await this.processNextSong()
        console.log(nextInQueue, "returned from process next song")

        //wait a few moments so player doesn't skuff
        await new Promise(resolve => setTimeout(resolve, 1000));

        
        if (!nextInQueue) {
            invokedMessage.channel.send("No songs left in queue. Stopping player.")
            this.stop()
            return
        }
        
        
        
        /**
         * Creates a message that shows song info then assigns an updater.
         */       
        //console.log(invokedMessage)
        
        const messageEmbedded = await this.createSongEmbed(invokedMessage, nextInQueue)
        
        
        /**
         * Create a player and play the song
         */
   
        const spawnAudioResource = require("./scripts/spawnAudioResource")
        
        try {
            logger.log("info", "Trying to create Audio Resource." )    
            const resource = await spawnAudioResource(nextInQueue);
            console.log("Got resources")
            this.audioPlayer.play(resource, { volume: MusicController.volume });
            console.log("Should be playing now")
            
            
        } catch (error) {
            logger.log("error", "Error occured while trying to create Audio Resource.", error )  
            //console.log("trying next")
            //this.playNext()
            return
            
        }

        

    }

    skip(invokedMessage, skipAmount) {
        
        if (this.queue.length == 0){
            this.command.reply("No playlist to skip ⚠")
            return
        }
        
        if (skipAmount > this.controller.MusicController.queue.length) {
            skipAmount = this.controller.MusicController.queue.length
        }

        if (!skipAmount || skipAmount === 1){
            this.command.reply(`Skipping ${this.getCurrentSong.videoTitle}`)
            this.queue.shift()
            this.playNext(invokedMessage)

        } else {
            for (let i = 0; i < skipAmount; i++) {
                this.queue.shift()
            }
            this.command.reply(`Skipping ${skipAmount} songs`)
            this.playNext(invokedMessage)
        }
    }
    
    stop(invokedMessage) {
        try {
            this.clearQueue()
            console.log("Queue cleared")

            this.controller.MusicController = null
            console.log("Music Controller destroyed")

            this.audioPlayer.stop(true)
            console.log("Audio Player stopped.")
            
            this.UpdatePlayerInfo.stop()
            console.log("Player updater stopped")

            this.voiceConnection.destroy();
            console.log("Voice connection destroyed.")
            logger.log("info", "Stopped music player and destroyed MusicController")
        } catch (error) {
            logger.log("error","Error while running MusicController.stop().", error)
        }
    }
    pause(invokedMessage) {
        
        try {
            
                this.audioPlayer.pause()
            
        } catch (error) {
            logger.log("info", "No dispatcher at present.", this.dispatcher, error)
        }
    }
    resume(invokedMessage) {

        
        try {
           
                this.audioPlayer.unpause()
            
        } catch (error) {
            logger.log("info", "Error while trying to resume.", error)
        }
    }
}