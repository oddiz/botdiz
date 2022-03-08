import { Command } from 'src/modules/Command'
import { logger } from '../logger'

module.exports = async function () {
    const self = this as unknown as Command
    try {
        const musicController = self.controller.MusicController
        if (!musicController) {
            self.reply("Bot is currently not playing.")
            
            return 
        }
    
        if (musicController.audioPlayerStatus === "PAUSED") {
            
            await musicController.resume()
            
            self.reply("▶️")
        } else if (musicController.audioPlayerStatus !== "PLAYING") {
            self.reply("Player is not active")
        } else if (musicController.audioPlayerStatus === "PLAYING") {
            self.reply("Player already playing")
        } else {
            logger.log("error","This shouldn't happen @ resume.js")
        }
        
    } catch (error) {
        logger.log("error", "Error while executing resume command :", error)
    }
}