import { Command } from "../modules/Command";
import { createLogger } from "../shared/logging/Logger";
import { MusicPlayerError } from "../shared/errors/BotdizError";

const logger = createLogger('PauseCommand');

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

        if (musicController.isPaused()) {
            self.reply("Player is already paused.");
            return;
        }

        if (!musicController.isPlaying()) {
            self.reply("Player is not currently playing.");
            return;
        }

        await musicController.pause();
        self.reply("⏸️ Use /resume to continue playing.");
        
    } catch (error) {
        logger.error('Error while executing pause command', error as Error);
        
        if (error instanceof MusicPlayerError) {
            self.reply(`❌ ${error.message}`);
        } else {
            self.reply("❌ Failed to pause playback.");
        }
    }
}