const { AudioPlayerStatus } = require('@discordjs/voice')
module.exports = async function (invokedMessage) {
    
    if (!this.controller.MusicController) {
        this.reply("Bot is currently not playing.")
        
        return 
    }

    if (this.controller.MusicController.audioPlayer.state.status === AudioPlayerStatus.Paused) {
        
        await this.controller.MusicController.resume(invokedMessage)
        
        this.reply("Player resumed")
    } else if (this.controller.MusicController.audioPlayer.state.status === AudioPlayerStatus.Idle) {
        this.reply("Player is not active")
    } else if (this.controller.MusicController.audioPlayer.state.status === AudioPlayerStatus.Playing){
        this.reply("Player already playing")
    } else {
        logger.log("error","This shouldn't happen @ resume.js")
    }
}