import { Command } from '../modules/Command';
import { createLogger } from '../shared/logging/Logger';
import { MusicPlayerError } from '../shared/errors/BotdizError';

const logger = createLogger('ResumeCommand');

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

        if (musicController.isPlaying()) {
            self.reply("Player is already playing.");
            return;
        }

        if (!musicController.isPaused()) {
            self.reply("Player is not paused.");
            return;
        }

        await musicController.resume();
        self.reply("▶️ Resumed playback.");
        
    } catch (error) {
        logger.error('Error while executing resume command', error as Error);
        
        if (error instanceof MusicPlayerError) {
            self.reply(`❌ ${error.message}`);
        } else {
            self.reply("❌ Failed to resume playback.");
        }
    }
}