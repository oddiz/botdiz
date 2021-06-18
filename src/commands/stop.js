module.exports = async function (invokedMessage) {
    
    if (!this.controller.MusicController) {
        this.reply("Bot is currently not playing.")
        
        return 
    }

    await this.controller.MusicController.stop(invokedMessage)
    this.reply("Stopped music player")

}