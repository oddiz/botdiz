const { logger } = require("../logger")

module.exports = async function (invokedMessage) {

    try {
        if (!this.controller.MusicController) {
            this.reply("Bot is currently not playing.")
            
            return 
        }
    
        await this.controller.MusicController.stop(invokedMessage)
        this.reply("⏹️ Stopped player")
        
    } catch (error) {
        logger.log("error", "Error while executing stop command : ", error)
    }
    

}