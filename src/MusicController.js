const { logger } = require("./logger")
const searchYT = require("./scripts/searchYT")
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

module.exports = class MusicController {
    constructor(controller, voiceConnection) {
        this.controller = controller;
        this.volume = 1
        
        this.readyLock = false;
        this.UPDATE_INTERVAL = 2000 // player stats update interval in ms
        
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Stop,
                maxMissedFrames: Math.round(config.maxTransmissionGap / 20)
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
					this.voiceConnection.reconnect();
				} else {
					/*
						The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
					*/
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
				void this.playNext();
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
            this.addToQueue(data)
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
/* 
    run(invokedMessage) {

        if (this.queue.length > 1) {
            invokedMessage.channel.send("Added to queue")
        }

        this.playNext(invokedMessage)
    }
*/
    
    getCurrentSong() {
        try {
            if (this.queue.length > 0){
                //console.log("CURRENT SONG IS: " + JSON.stringify(this.queue[0]))
                return this.queue[0]
            } else {
                //console.log("NO SONGS IN THE QUEUE")
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
            let nextInQueue = this.getCurrentSong();
                    
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
                            
                            return nextInQueue
                        })
    
                    } else {
                        console.error("Error getting YT info from: "+ query)
                        console.error("Error from music COntroller play next()")
                    }
                })
    
            } else {
                
                return nextInQueue
            }
            
        } catch (error) {
            logger.log("error", "ERROR while processing the queue.")
            
            return false
        }
    }

    manageSongEmbed(invokedMessage, nextInQueue) {
        
        let botMessage;
        const updatePlayer = require("./scripts/updatePlayer")
        
        const { MessageEmbed } = require("discord.js")
        let embedMessage = new MessageEmbed()
        
        embedMessage
            .setColor("#e9b463")
            .addField("Now Playing: ",`${nextInQueue.videoTitle}`)
            .setTimestamp()
        if(nextInQueue.videoThumbnailUrl) {
            embedMessage = embedMessage
                .setThumbnail(nextInQueue.videoThumbnailUrl)
        }
        
        invokedMessage.channel.messages.fetch({ limit: 1}).then(messages => {
            let lastMessage = messages.first()
            
            if(lastMessage.author.bot) {
                lastMessage.edit(embedMessage).then( message => {
                    botMessage = message
                    const originalVideoTitle = nextInQueue.videoTitle;

                    updatePlayer(this, invokedMessage, nextInQueue, botMessage)

                    return true
                }).catch(err=>{console.log("Error while executing manageSongEmbed() / edit embed"), err})
            } else {
                invokedMessage.channel.send( { embeds: [embedMessage]}).then( message => {
                    botMessage = message
                    const originalVideoTitle = this.getCurrentSong().videoTitle;
                    
                    updatePlayer(this, invokedMessage,nextInQueue, botMessage)

                    return true
                }).catch(err=>{console.log("Error while executing manageSongEmbed() / send new embed", err)})
            }
        });

    }

    async playNext(invokedMessage) {
        const self = this

        const nextInQueue = await this.processNextSong()
        console.log(nextInQueue, "returned from process next song")
        
        if (!nextInQueue) {
            console.log(`Next in queue is ${nextInQueue}, Current queue: ${this.queue}`)
            return
        }

        /**
         * Creates a message that shows song info then assigns an updater.
         */
         
       
 
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
            this.manageSongEmbed(invokedMessage, nextInQueue)
            
        } catch (error) {
            logger.log("error", "Error occured while trying to create Audio Resource.", error )  
            //console.log("trying next")
            //this.playNext()
            return
            this.manageSongEmbed(invokedMessage, nextInQueue)
        }

        

    }

    skip(invokedMessage, skipAmnt) {
        let skipAmount = 1

        if (this.controller.MusicController.queue.length == 0){
            invokedMessage.reply("No playlist to skip ⚠")
            return
        }
        if (skipAmount > this.controller.MusicController.queue.length) {
            skipAmount = this.controller.MusicController.queue.length
        }
        for (let i = 0; i < skipAmount; i++) {
            this.controller.MusicController.queue.shift()
        }
        this.controller.MusicController.playNext(invokedMessage)
    }
    
    stop(invokedMessage) {
        try {
            this.dispatcher.destroy()
            this.isSpeaking = false;
            this.clearQueue()
            
        } catch (error) {
            logger.log("info","Error while running MusicController.stop().", error)
        }
    }
    pause(invokedMessage) {

        try {
            if (this.controller.MusicController.dispatcher.paused) {
                invokedMessage.reply("Player already paused")
                 
            } else {
                this.controller.MusicController.dispatcher.pause()
                invokedMessage.channel.send("Player paused")
            }
        } catch (error) {
            logger.log("info", "No dispatcher at present.", this.dispatcher, error)
        }
    }
    resume(invokedMessage) {

        
        try {
            if (!this.controller.MusicController.dispatcher.paused) {
                invokedMessage.reply("Player already playing")
                 
            } else {
                this.controller.MusicController.dispatcher.resume()
                invokedMessage.channel.send("Player resumed")
            }
        } catch (error) {
            logger.log("info", "No dispatcher at present.", this.dispatcher, error)
        }
    }
}