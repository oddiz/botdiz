const { AudioPlayerStatus } = require('@discordjs/voice')
module.exports = async function (invokedMessage) {
    if (!this.controller.MusicController) {
        this.reply("Bot is currently not playing.")
        
        return 
    }
    if (this.controller.MusicController.audioPlayer.state.status === AudioPlayerStatus.Paused) {
        this.reply("Player already paused")
         
    } else if (this.controller.MusicController.audioPlayer.state.status === AudioPlayerStatus.Idle) {
        this.reply("Player is not active")
    } else {
        await this.controller.MusicController.pause(invokedMessage)
        
        this.reply("Player paused. /resume to continue playing.")
    }

    
}