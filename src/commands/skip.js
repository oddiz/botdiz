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
            if (skipAmountInt >= 0) {
                this.controller.MusicController.skip(invokedMessage, skipAmountInt)
            } else {
                this.wrongUsage(invokedMessage, this.name, "Can't skip back in time.")

                return
            }
        } else if (skipAmount === ""){
            this.controller.MusicController.skip(invokedMessage, 1)
        } else {
            this.wrongUsage(invokedMessage, this.name)
            
        }
    } else {
        console.log("Something wrong happened at skip.js. ")
    }
}