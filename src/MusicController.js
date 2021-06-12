const { logger } = require("./logger")



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

            this.queue.push(song) 

    }

    run(invokedMessage) {
        //console.log(this.isSpeaking, "is speaking?")

        if (this.isSpeaking) {
            invokedMessage.channel.send("Added to queue.")
        } else {
            this.playNext(invokedMessage)
        }
    }

    playNext(invokedMessage) {
        const voiceChannel = invokedMessage.member.voice.channel

        if (this.queue.length === 0){
            invokedMessage.channel.send("Queue completed")
            this.controller.MusicController.dispatcher.destroy()
            this.controller.MusicController.isSpeaking = false;
            this.controller.MusicController.queue = []
            voiceChannel.leave()
            
            return
        }
        
        const nextInQueue = this.queue[0];
        //const songPath = nextInQueue.file
        const youtubeUrl = nextInQueue.videoUrl
        const ytld = require("ytdl-core")
        voiceChannel.join()
        .then(connection =>{

            const dispatcher = connection.play(ytld(youtubeUrl, { quality: "highestaudio"}), { volume: this.volume });
            this.isSpeaking = true
            this.dispatcher = dispatcher
            dispatcher.on("start", start => {
                console.log("Starting dispatcher")

            })
            dispatcher.on("speaking", isSpeaking => {


            })

            dispatcher.on("finish", end => {

                this.isSpeaking = false
                this.queue.shift()
                this.playNext(invokedMessage)
               
            })
        })
        .catch(err => logger.log("error", `Error while invoking playNext command! Err: ${err}`));


    }

    skip(invokedMessage, skipAmnt) {
        let skipAmount = 1
        if (parseInt(skipAmnt)) {
            skipAmount = skipAmnt
        }

        for (let i = 0; i < skipAmount; i++) {
            this.queue.shift()
        }
    }
    
    stop(invokedMessage) {
        try {
            this.controller.MusicController.dispatcher.destroy()
            this.controller.MusicController.isSpeaking = false;
            this.controller.MusicController.queue = []
            invokedMessage.member.voice.channel.leave()
        } catch (error) {
            console.log("No dispatcher at present.", this.dispatcher)
        }
    }
    pause(invokedMessage) {
        try {
            this.controller.MusicController.dispatcher.player.dispatcher.pause()
            invokedMessage.channel.send("Player paused")
        } catch (error) {
            console.log("No dispatcher at present.", this.dispatcher, error)
        }
    }
    resume(invokedMessage) {

        
        try {
            this.controller.MusicController.dispatcher.player.dispatcher.resume()
            
            invokedMessage.channel.send("Player resumed")
        } catch (error) {
            console.log("No dispatcher at present.", this.dispatcher, error)
        }
    }
}

module.exports = MusicController