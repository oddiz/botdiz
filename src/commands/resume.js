module.exports = function (invokedMessage) {
    
    if (!this.controller.MusicController) {
        this.reply("Bot is currently not playing.")
        
        return 
    }

    this.controller.MusicController.resume(invokedMessage)

}