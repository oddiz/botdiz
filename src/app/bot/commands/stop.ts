import { Command } from "../modules/Command";
import { CommandInteraction } from "discord.js";
import { createLogger } from "../shared/logging/Logger";
import { MusicPlayerError } from "../shared/errors/BotdizError";

const logger = createLogger('StopCommand');

export default async function (this: Command) {
    const self = this;
    
    try {
        const musicController = self.controller.MusicController;
        
        if (!musicController) {
            self.reply("Bot is currently not playing.");
            return;
        }

        if (!musicController.isConnected()) {
            self.reply("Bot is not connected to a voice channel.");
            return;
        }

        const currentTrack = musicController.getCurrentTrack();
        
        await musicController.stop();
        await musicController.clearQueue();
        
        if (currentTrack) {
            self.reply(`⏹️ Stopped playing \`${currentTrack.info.title}\` and cleared queue.`);
        } else {
            self.reply("⏹️ Stopped player and cleared queue.");
        }
        
    } catch (error) {
        logger.error('Error while executing stop command', error as Error);
        
        if (error instanceof MusicPlayerError) {
            self.reply(`❌ ${error.message}`);
        } else {
            self.reply("❌ Failed to stop playback.");
        }
    }
}