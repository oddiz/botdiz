module.exports = MusicController

class MusicController {
    constructor() {
        this.queue = [];
        
    }

    download(videoId){
        var YtMp3Downloader = require("youtube-mp3-downloader")
    }

    addToQueue(videoId) {
        this.queue.push(videoId)
    }

    run() {

    }

    skip(skipAmnt) {
        let skipAmount = 1
        if (parseInt(skipAmnt)) {
            skipAmount = skipAmnt
        }
    }
}