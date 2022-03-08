import { logger } from '../logger'
import { Command } from 'src/modules/Command'
export default async () => {
    const self = this as unknown as Command
    try {
        const MusicController = self.controller.MusicController

        if (!MusicController) {
            
            return 
        }

        MusicController.autoplay = !MusicController.autoplay

        self.controller.saveGuildSettings()

        self.reply({ content: `\`Autoplay is now ${MusicController.autoplay ? "on":"off"}\``})
    } catch (error) {
        logger.log("error", "Error while executing autoplay command: " + error)
    }
}