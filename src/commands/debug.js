const { logger } = require("../logger")

module.exports = function(invokedMessage, option) {

    try {
        //takes "on" or "off" as argument
        if (arguments.length > 2) {
            this.wrongUsage(invokedMessage, this.name)
            
            return
        }
        
        if (this.controller.toggleDebug(option)) {
            this.reply("Debug mode is now on.")
        } else {
            this.reply("Debug mode is now off.")
        }
        
    } catch (error) {
        logger.log()
    }
}