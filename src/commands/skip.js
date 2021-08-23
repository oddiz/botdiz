const { logger } = require("../logger")

module.exports = function (invokedMessage) {

    try {
        
        const skipAmount = invokedMessage.options.getInteger("amount") || 1
        if (!this.controller.MusicController) {
            this.reply("Bot is currently not playing.")
            
            return 
        }
        //set music controller's reply depending on this command
        this.controller.MusicController.command = this
        
        const currentSong = this.controller.MusicController.getCurrentSong()
        if (!currentSong) {
            this.reply("Bot is currently not playing.")
        }
    
        if (arguments.length > 2) {
            this.wrongUsage(invokedMessage, this.name, "Too many arguments for skip.")
    
            return
        } else if (arguments.length <= 2) {
            skipAmountInt = parseInt(skipAmount)    
            if (Number.isInteger(skipAmountInt)) {
                if (skipAmountInt >= 2) {
                    this.controller.MusicController.skip(skipAmountInt)
                    this.reply({ content: `Skipping to ${skipAmountInt}. song.`, ephemeral: true })
                } else if(skipAmountInt == 1) {
                    this.reply( { content: `Skipping ${currentSong.videoTitle}`, ephemeral: true})
                    this.controller.MusicController.skip(1)
    
                } else if (skipAmountInt == 0) {
                    this.wrongUsage(invokedMessage, this.name, "Huh?")
    
                    return
                
                } else{
                    this.wrongUsage(invokedMessage, this.name, "Can't skip back in time.")
    
                    return
                }
            } else if (skipAmount === "" || arguments.length === 1){
                this.reply({ content:`Skipping ${currentSong.videoTitle}`, ephemeral: true })
                    this.controller.MusicController.skip(1)
    
                return
            } else {
                this.wrongUsage(invokedMessage, this.name)
                
            }
        } else {
            logger.log("error","Something wrong happened at skip.js. ")
        }
    } catch (error) {
        logger.log("error", "Error while executing skip command : ", error)
    }

}