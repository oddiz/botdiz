const { AudioPlayerStatus } = require("@discordjs/voice")
const { logger } = require('../logger')
module.exports = function (invokedMessage) {

    try {
        if (!this.controller.MusicController) {
            
            this.reply("Nothing is playing")
        } else {
            if(!this.controller.MusicController.audioPlayer.playing) {
                this.reply("Nothing is playing")
            } else if (this.controller.MusicController.audioPlayer.playing){
    
                const currentSong = this.controller.MusicController.getCurrentSong()
    
                this.reply("`Current song:`", { ephemeral: true })
                this.controller.MusicController.command = this
                this.controller.MusicController.createSongEmbed(currentSong)
                
                
            }
        }
        
    } catch (error) {
        logger.log("error", "Error while executing status command :", error)
    }
    

    
}