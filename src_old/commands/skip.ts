import { Command } from "../modules/Command";
import { ChatInputCommandInteraction } from "discord.js";
import { createLogger } from "../shared/logging/Logger";
import { MusicPlayerError, ValidationError } from "../shared/errors/BotdizError";

const logger = createLogger('SkipCommand');

export default async function (this: Command, invokedMessage?: ChatInputCommandInteraction | null) {
    const self = this;
    
    try {
        if (!invokedMessage) {
            throw new Error("invokedMessage is not defined");
        }

        const skipAmount = invokedMessage.options.getInteger("amount") || 1;
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
        if (!currentTrack) {
            self.reply("No track is currently playing.");
            return;
        }

        if (skipAmount <= 0) {
            self.wrongUsage(invokedMessage, self.name, "Skip amount must be a positive number.");
            return;
        }

        if (skipAmount === 1) {
            await musicController.skip();
            self.reply(`⏭️ Skipped: \`${currentTrack.info.title}\``);
        } else {
            const skippedTracks = await musicController.skip(skipAmount);
            const skippedCount = skippedTracks.length;
            
            if (skippedCount === 1) {
                self.reply(`⏭️ Skipped: \`${skippedTracks[0].info.title}\``);
            } else {
                self.reply(`⏭️ Skipped ${skippedCount} tracks.`);
            }
        }
        
    } catch (error) {
        logger.error('Error while executing skip command', error as Error);
        
        if (error instanceof MusicPlayerError || error instanceof ValidationError) {
            self.reply(`❌ ${error.message}`);
        } else {
            self.reply("❌ Failed to skip track(s).");
        }
    }
}
