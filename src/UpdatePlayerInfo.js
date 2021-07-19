const { MessageEmbed } = require('discord.js');

const { logger } = require('./logger')

module.exports = class UpdatePlayerInfo {
    constructor(MusicController) {
        this.MusicController = MusicController,
        
        this.messageToEdit;
        this.currentSong;

        this.quit = false
        this.loopCount = 1
    }

    start() {
        this.quit = false;
        
        this.updateLoop();
    }

    stop(){
        this.quit = true;
    }

    async updateLoop() {
        while (!this.quit){
            if (!(this.messageToEdit && this.currentSong)){
                await new Promise(resolve => setTimeout(resolve, this.MusicController.UPDATE_INTERVAL + 2000));

                continue
            }
            try {
                
                this.looping = true;
                let newEmbed = new MessageEmbed()
                    newEmbed = newEmbed
                    .setColor(this.MusicController.controller.roleColor)
                    .addField("Now Playing: ",`${this.currentSong.videoTitle}`)
                    .setTimestamp()
                if(this.currentSong.videoThumbnailUrl) {
                    newEmbed = newEmbed
                        .setThumbnail(this.currentSong.videoThumbnailUrl)
                }
    
                const streamtime = this.MusicController.audioPlayer._state.playbackDuration || 0;
                const streamHours = Math.floor(streamtime / (1000 * 60 * 60) % 60)
                const streamMins = Math.floor(streamtime / (1000 * 60) % 60)
                const streamSecs = Math.floor(streamtime / 1000 % 60)
                
                
                const videoLength= this.currentSong.videoDuration; //secs
                const videoHours = Math.floor((videoLength / (60 *60)) % 60)
                const videoMins = Math.floor((videoLength / 60) % 60)
                const videoSecs = Math.floor(videoLength % 60)
                
                const videoLenMs = videoLength * 1000
                
                const percentage = (streamtime * 100) / videoLenMs
    
                let lines = new Array(30);
                lines[parseInt(Math.floor(percentage/(100/30)))] = "🟠";
                lines = lines.join("-")
                let newEmbedMessage;
                
                if (videoLength == 0){
                    newEmbedMessage = newEmbed
                    .addField(`Play time:`, `${streamHours}:${streamMins.toString().padStart(2,0)}:${streamSecs.toString().padStart(2, '0')}`)
                } else if (videoHours > 0) {
                    newEmbedMessage = newEmbed
                    .addField(`${streamHours}:${streamMins.toString().padStart(2,0)}:${streamSecs.toString().padStart(2, '0')} / ${videoHours}:${videoMins.toString().padStart(2, 0)}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|`)
                } else {
                    newEmbedMessage = newEmbed
                        .addField(`${streamMins}:${streamSecs.toString().padStart(2, '0')} / ${videoMins}:${videoSecs.toString().padStart(2, '0')}`, `|${lines}|`)
                    
                }
                

                await this.messageToEdit.edit({ embeds: [newEmbedMessage]})
                
                this.loopCount ++;

            } catch (error) {
                logger.log("error", "Error in update loop.", error)
            }
            await new Promise(resolve => setTimeout(resolve, this.MusicController.UPDATE_INTERVAL));
        }
        this.looping = false
        
        return

    }

    /**
     * Change the message to be updated
     * @param {Message} message 
     */
    changeMessage(message) {
        if(!message) {
            // no message to change
            return
        }
        this.oldMessage = this.messageToEdit
        try {

            if(!this.oldMessage) {
                //no message to delete so just return
                return
            }
            this.oldMessage.delete()
        } catch (err) {
            logger.log("error", "Error while trying to delete old embed message: ", err)
        }
        this.messageToEdit = message
        this.quit = false;
    }

    /**
     * Change the song
     * @param {nextInQueue} song 
     */
    changeSong(song) {
        this.currentSong = song
        this.quit = false;
    }

    
}