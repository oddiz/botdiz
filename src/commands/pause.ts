import { Command } from "../modules/Command"

import { logger } from '../logger'

export default async function (this: Command) {
    const self = this 

    try {
        if (!self.controller.MusicController || !self.controller.MusicController.audioPlayer) {
            self.reply("Bot is currently not playing.")
            
            return 
        }
        if (self.controller.MusicController.audioPlayerStatus === "PAUSED") {
            self.reply("Player already paused")
             
        } else if (self.controller.MusicController.audioPlayerStatus !== "PLAYING") {
            self.reply("Player is not active")
        } else {
            self.controller.MusicController.pause()
            
            self.reply("⏸️ /resume to continue playing.")
        }


        
    } catch (error) {
        logger.log("error", "Error while executing pause:", error)
    }

    
}