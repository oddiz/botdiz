const { logger } = require("../logger")

module.exports = function (invokedMessage, skipAmount) {

    if (!this.controller.MusicController) {
        this.reply("Bot is currently not playing.")

        return 
    }


    if (arguments.length > 2) {
        this.wrongUsage(invokedMessage, this.name, "Too many arguments for skip.")

        return
    } else if (arguments.length <= 2) {
        skipAmountInt = parseInt(skipAmount)    
        if (Number.isInteger(skipAmountInt)) {
            if (skipAmountInt >= 2) {
                this.controller.MusicController.skip(skipAmountInt)
                this.reply(`Skipping ${skipAmountInt} songs.`)
            } else {
                this.wrongUsage(invokedMessage, this.name, "Can't skip back in time.")

                return
            }
        } else if (skipAmount === "" || arguments.length === 1){
            const currentSong = this.controller.MusicController.getCurrentSong()
            if (currentSong) {
                this.reply(`Skipping ${currentSong.videoTitle}`)
                this.controller.MusicController.skip(1)
            } else {
                this.reply("Bot is currently not playing.")
            }

            return
        } else {
            this.wrongUsage(invokedMessage, this.name)
            
        }
    } else {
        logger.log("error","Something wrong happened at skip.js. ")
    }
}