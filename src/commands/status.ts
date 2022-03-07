import { Command } from '@src/modules/Command'
import { logger } from '../logger'

export default async () => {
    const self = this as unknown as Command
    try {
        const musicController = self.controller.MusicController;
        if (!musicController) {
            
            self.reply("Nothing is playing")
        } else {
            if(musicController.audioPlayerStatus !== "PLAYING") {
                self.reply("Nothing is playing")
            } else {
    
                const currentSong = musicController.getCurrentSong()
                if (currentSong) {
                    await self.reply("`Current song:`")
                    musicController.createSongEmbed(currentSong)
                }
                
                
            }
        }
        
    } catch (error) {
        logger.log("error", "Error while executing status command :", error)
    }
    

    
}