const { logger } = require("./logger")
const searchYT = require("./scripts/searchYT")


class MusicController {
    constructor(controller) {
        this.queue = [];
        this.controller = controller;
        this.volume = 1
        this.dispatcher;
        this.isSpeaking = false;
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

    run(invokedMessage) {

        if (this.queue.length > 1) {
            invokedMessage.channel.send("Added to queue")
        }

        this.playNext(invokedMessage)
    }

    playNext(invokedMessage) {
        const self = this
        const voiceChannel = invokedMessage.member.voice.channel
        //console.log(self)
        if (this.queue.length === 0){
            invokedMessage.channel.send("Queue completed")
            this.controller.MusicController.dispatcher.destroy()
            this.controller.MusicController.isSpeaking = false;
            this.controller.MusicController.queue = []
            voiceChannel.leave()
            
            return
        }
        let youtubeUrl;
        
        self.nextInQueue = self.queue[0];
        
        if (self.nextInQueue.isSpotify) {
            //if came from spotify link
            //only videoArtist, videoTitle, isSpotify present
            const getInfoFromYoutubeUrl = require("./scripts/getInfoFromYoutubeUrl")

            const query = self.nextInQueue.videoTitle

            searchYT(query, 1, (result) => {
                                        
                if (result) {
                    //invokedMessage.channel.send("Video found: " + result.videoUrl)
                    getInfoFromYoutubeUrl(result.videoUrl, result => {
                        self.nextInQueue = result;
                        doRest(self)
                    })

                } else {
                    console.error("Error getting YT info from: "+ query)
                    console.error("Error from music COntroller play next()")
                }
            })

        } else {
            self.nextInQueue = self.queue[0] 
            doRest(self) 
        }
        function doRest(self) {

            let embedMessage = new self.controller.discord.MessageEmbed()
            
            embedMessage = embedMessage
                .setColor("#e9b463")
                .addField("Now Playing: ",`${self.nextInQueue.videoTitle}`)
                .setTimestamp()
            if(self.nextInQueue.videoThumbnailUrl) {
                embedMessage = embedMessage
                    .setThumbnail(self.nextInQueue.videoThumbnailUrl)
            }
    
            let botMessage;
    
            invokedMessage.channel.messages.fetch({ limit: 1}).then(messages => {
                let lastMessage = messages.first()
                
                if(lastMessage.author.bot) {
                    lastMessage.edit(embedMessage).then( message => {
                        botMessage = message
                        const updateVideoTitle = self.nextInQueue.videoTitle;
    
                        updatePlayer(self, invokedMessage,updateVideoTitle, botMessage)
                    })
                } else {
                    invokedMessage.channel.send(embedMessage).then( message => {
                        botMessage = message
                        const updateVideoTitle = self.nextInQueue.videoTitle;
    
                        updatePlayer(self, invokedMessage,updateVideoTitle, botMessage)
                    })
                }
            });
    
            const updatePlayer = function(self, invokedMessage, updateVideoTitle, botMessage) {
                setTimeout(function () {
                    let currentTitle

                    try {
                        currentTitle = self.nextInQueue.videoTitle;
                        //console.log(self)
                        console.log(currentTitle)
                        console.log(updateVideoTitle)

                        console.log("Current Title, updateVideoTitle")
                    } catch (error) {
                        logger.log("info", "No queue present terminating update queue", error);
                        
                        return
                    }
                    if (currentTitle !== updateVideoTitle) {
                        logger.log("info", "Disabling update loop for "+updateVideoTitle)
                        return;
                    }
                    if(currentTitle === updateVideoTitle) {
                            let newEmbed = new self.controller.discord.MessageEmbed()
                            newEmbed = newEmbed
                            .setColor("#e9b463")
                            .addField("Now Playing: ",`${updateVideoTitle}`)
                            .setTimestamp()
                        if(self.nextInQueue.videoThumbnailUrl) {
                            newEmbed = newEmbed
                                .setThumbnail(self.nextInQueue.videoThumbnailUrl)
                        }
                        const streamtime = self.controller.MusicController.dispatcher.streamTime;
                        const streamHours = Math.floor(streamtime / (1000 * 60 * 60) % 60)
                        const streamMins = Math.floor(streamtime / (1000 * 60) % 60)
                        const streamSecs = Math.floor(streamtime / 1000 % 60)
                        
                        
                        const videoLenght= self.nextInQueue.videoDuration; //secs
                        const videoHours = Math.floor((videoLenght / (60 *60)) % 60)
                        const videoMins = Math.floor((videoLenght / 60) % 60)
                        const videoSecs = Math.floor(videoLenght % 60)
                        
                        const videoLenMs = videoLenght * 1000
                        
                        const percentage = (streamtime * 100) / videoLenMs
    
                        
                        let lines = new Array(50);
                        lines[parseInt(Math.floor(percentage/2))] = "🟠";
                        lines = lines.join("-")
                        let newEmbedMessage;
                        if (videoHours > 0){
                            newEmbedMessage = newEmbed
                            .addField(`${streamHours}:${streamMins.toString().padStart(2,0)}:${streamSecs.toString().padStart(2, '0')} / ${videoHours}:${videoMins.toString().padStart(2, 0)}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|`)
                        } else {
                            newEmbedMessage = newEmbed
                                .addField(`${streamMins}:${streamSecs.toString().padStart(2, '0')} / ${videoMins}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|`)
                            
                        }
    
                        botMessage.edit(newEmbedMessage)
                        
                        updatePlayer(self, invokedMessage, updateVideoTitle, botMessage)
                    } else {
                        logger.log("info","Exiting update player")
                    }
                    
    
                }, 2000)
                
            }
    
            
            const ytld = require("ytdl-core")
            voiceChannel.join()
            .then(connection =>{
                logger.log("info", "Trying to start dispatcher." )
                if (self.controller.MusicController.dispatcher) {
                    self.controller.MusicController.dispatcher.destroy()
                }
                const dispatcher = connection.play(ytld(self.nextInQueue.videoUrl, { quality: "highestaudio"}), { volume: self.volume });
                self.isSpeaking = true
                self.dispatcher = dispatcher
                dispatcher.on("start", start => {
                    logger.log("info","Starting dispatcher")
    
                })
                dispatcher.on("speaking", isSpeaking => {
    
    
                })
    
                dispatcher.on("finish", end => {
    
                    self.isSpeaking = false
                    self.queue.shift()
                    self.playNext(invokedMessage)
                   
                })
            })
            .catch(err => logger.log("error", `Error while invoking playNext command! Err: ${err}`));
        }


    }

    skip(invokedMessage, skipAmnt) {
        let skipAmount = 1
        if (parseInt(skipAmnt)) {
            skipAmount = skipAmnt
        }

        for (let i = 0; i < skipAmount; i++) {
            this.controller.MusicController.queue.shift()
        }
        this.controller.MusicController.playNext(invokedMessage)
    }
    
    stop(invokedMessage) {
        try {
            this.controller.MusicController.dispatcher.destroy()
            this.controller.MusicController.isSpeaking = false;
            this.controller.MusicController.queue = []
            this.controller.nextInQueue = []
            invokedMessage.member.voice.channel.leave()
        } catch (error) {
            logger.log("info","No dispatcher at present.", this.dispatcher)
        }
    }
    pause(invokedMessage) {
        try {
            this.controller.MusicController.dispatcher.player.dispatcher.pause()
            invokedMessage.channel.send("Player paused")
        } catch (error) {
            logger.log("info", "No dispatcher at present.", this.dispatcher, error)
        }
    }
    resume(invokedMessage) {

        
        try {
            this.controller.MusicController.dispatcher.player.dispatcher.resume()
            
            invokedMessage.channel.send("Player resumed")
        } catch (error) {
            logger.log("info", "No dispatcher at present.", this.dispatcher, error)
        }
    }
}

module.exports = MusicController