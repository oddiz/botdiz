const { logger } = require("../logger")

module.exports = function (invokedMessage, skipAmount) {

    if (!this.controller.MusicController) {
        this.reply("Bot is currently not playing.")

        return 
    }

    console.log(arguments)

    if (arguments.length > 2) {
        this.wrongUsage(invokedMessage, this.name, "Too many arguments for skip.")

        return
    } else if (arguments.length <= 2) {
        skipAmountInt = parseInt(skipAmount)    
        if (Number.isInteger(skipAmountInt)) {
            if (skipAmountInt >= 2) {
                this.controller.MusicController.skip(invokedMessage, skipAmountInt)
                this.reply(`Skipping ${skipAmountInt} songs.`)
            } else {
                this.wrongUsage(invokedMessage, this.name, "Can't skip back in time.")

                return
            }
        } else if (skipAmount === "" || arguments.length === 1){
            this.controller.MusicController.skip(invokedMessage, 1)
            this.reply("Skipping 1 song.")
        } else {
            this.wrongUsage(invokedMessage, this.name)
            
        }
    } else {
        logger.log("error","Something wrong happened at skip.js. ")
    }
}