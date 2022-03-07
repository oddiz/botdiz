import { Command } from "@src/modules/Command"
import { CommandInteraction } from "discord.js"
import { logger } from "../logger"

module.exports = async function () {

    const self = this as unknown as Command
    try {
        if (!self.controller.MusicController) {
            self.reply("Bot is currently not playing.")
            
            return 
        }
    
        await self.controller.MusicController.stop()
        self.reply("⏹️ Stopped player")
        
    } catch (error) {
        logger.log("error", "Error while executing stop command : ", error)
    }
    

}