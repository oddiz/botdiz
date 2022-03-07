import { Command } from '@src/modules/Command'
import { logger } from '../logger'

export default async () => {
    const self = this as unknown as Command
    try {
        const musicController = self.controller.MusicController
        if (!musicController || !musicController.audioPlayer) {
            self.reply("Bot is currently not playing.")
            
            return 
        }
        if (musicController.queue.length > 0) {
            
            let result = await musicController.shuffleQueue()

            if (result) {
                self.reply("Shuffled songs.")
            } else {
                self.reply("Failed to shuffle songs. New feature, probably bugged out")
            }

        }   else if (musicController.queue.length === 0) {
            self.reply("Queue is empty.")
        }


        
    } catch (error) {
        logger.log("error", "Error while executing pause:", error)
    }

    
}