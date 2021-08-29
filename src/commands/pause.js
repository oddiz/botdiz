const { AudioPlayerStatus } = require('@discordjs/voice')
const { logger } = require('../logger')
module.exports = async function (invokedMessage) {
    try {
        if (!this.controller.MusicController || !this.controller.MusicController.audioPlayer) {
            this.reply("Bot is currently not playing.")
            
            return 
        }
        if (this.controller.MusicController.audioPlayer.paused) {
            this.reply("Player already paused")
             
        } else if (!this.controller.MusicController.audioPlayer.playing) {
            this.reply("Player is not active")
        } else {
            await this.controller.MusicController.pause(invokedMessage)
            
            this.reply("⏸️ /resume to continue playing.")
        }
        
    } catch (error) {
        logger.log("error", "Error while executing pause:", error)
    }

    
}