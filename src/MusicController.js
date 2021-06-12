const { VoiceChannel } = require("discord.js");
const { logger } = require("./logger")



class MusicController {
    constructor(controller) {
        this.queue = [];
        this.controller = controller;
        this.volume = 1
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

    addToQueue(videoUrls) {
        for (const url of videoUrls) {

            this.queue.push(url)
            console.log(url)
        }
    }

    play(invokedMessage) {
        const nextInQueue = this.queue.shift();
        //const songPath = nextInQueue.file
        const youtubeUrl = nextInQueue
        const voiceChannel = invokedMessage.member.voice.channel
        const ytld = require("ytdl-core")
        voiceChannel.join()
        .then(connection =>{
            const dispatcher = connection.play(ytld(youtubeUrl, { quality: "highestaudio"}), { volume: this.volume });

            dispacher.on("status", isSpeaking => {

                this.isSpeaking = true

            })

            dispatcher.on("finish", end => {

                this.isSpeaking = false
                voiceChannel.leave()
            })
        })
        .catch(err => logger.log("error", `Error while invoking play command! Err: ${err}`));


    }

    skip(skipAmnt) {
        let skipAmount = 1
        if (parseInt(skipAmnt)) {
            skipAmount = skipAmnt
        }

        for (let i = 0; i < skipAmount; i++) {
            this.queue.shift()
        }
    }
}

module.exports = MusicController