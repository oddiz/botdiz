const { logger } = require('../logger')
module.exports = async function (invokedMessage) {
    try {
        if (!this.controller.MusicController || !this.controller.MusicController.audioPlayer) {
            this.reply("Bot is currently not playing.")
            
            return 
        }
        if (this.controller.MusicController.queue.length > 0) {
            
            let result = await this.controller.MusicController.shuffleQueue()

            if (result) {
                this.reply("Shuffled songs.")
            } else {
                this.reply("Failed to shuffle songs. New feature, probably bugged out")
            }

        }   else if (this.controller.MusicController.queue.length === 0) {
            this.reply("Queue is empty.")
        }


        
    } catch (error) {
        logger.log("error", "Error while executing pause:", error)
    }

    
}