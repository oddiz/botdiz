import { Command } from "@src/modules/Command"

import { logger } from '@src/logger'

export default async () => {
    const self = this as unknown as Command

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