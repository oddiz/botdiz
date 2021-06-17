const { MessageEmbed } = require('discord.js');

const { logger } = require('./logger')

module.exports = class UpdatePlayerInfo {
    constructor(MusicController) {
        this.MusicController = MusicController,
        
        this.messageToEdit;
        this.currentSong;

        this.quit = false

    }

    start(messageToEdit, currentSong) {
        this.messageToEdit = messageToEdit;
        this.currentSong = currentSong;
        this.quit = false;
        
        this.updateLoop();
    }

    stop(){
        this.quit = true;
    }

    async updateLoop() {
        while (!quit){
            console.log("Updating loop. (updatePlayer.js:25)")
            let newEmbed = new MessageEmbed()
                newEmbed = newEmbed
                .setColor("#e9b463")
                .addField("Now Playing: ",`${this.currentSong.videoTitle}`)
                .setTimestamp()
            if(this.currentSong.videoThumbnailUrl) {
                newEmbed = newEmbed
                    .setThumbnail(this.currentSong.videoThumbnailUrl)
            }

            const streamtime = this.MusicController.audioPlayer._state.playbackDuration;
            const streamHours = Math.floor(streamtime / (1000 * 60 * 60) % 60)
            const streamMins = Math.floor(streamtime / (1000 * 60) % 60)
            const streamSecs = Math.floor(streamtime / 1000 % 60)
            
            
            const videoLenght= this.currentSong.videoDuration; //secs
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

            this.messageToEdit.editReply({ embeds: [newEmbedMessage]})
            await new Promise(resolve => setTimeout(resolve, this.MusicController.UPDATE_INTERVAL));
        }
    }

    /**
     * Change the message to be updated
     * @param {Message} message 
     */
    changeMessage(message) {
        this.messageToEdit = message
    }

    /**
     * Change the song
     * @param {nextInQueue} song 
     */
    changeSong(song) {
        this.currentSong = song
    }

    
}