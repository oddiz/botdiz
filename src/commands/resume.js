const { AudioPlayerStatus } = require('@discordjs/voice')
const { logger } = require('../logger')
module.exports = async function (invokedMessage) {
    try {
        if (!this.controller.MusicController) {
            this.reply("Bot is currently not playing.")
            
            return 
        }
    
        if (this.controller.MusicController.audioPlayer.paused) {
            
            await this.controller.MusicController.resume(invokedMessage)
            
            this.reply("▶️")
        } else if (!this.controller.MusicController.audioPlayer.playing) {
            this.reply("Player is not active")
        } else if (this.controller.MusicController.audioPlayer.playing){
            this.reply("Player already playing")
        } else {
            logger.log("error","This shouldn't happen @ resume.js")
        }
        
    } catch (error) {
        logger.log("error", "Error while executing resume command :", error)
    }
}