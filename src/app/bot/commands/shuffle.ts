import { createLogger } from "@logger";
import { Command } from "../modules/Command";
import { MusicPlayerError } from "shared/errors/BotdizError";

const logger = createLogger("ShuffleCommand");

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

        const queue = musicController.getQueue();

        if (queue.length === 0) {
            self.reply("Queue is empty. Add some tracks first!");
            return;
        }

        if (queue.length === 1) {
            self.reply("Only one track in queue. Add more tracks to shuffle!");
            return;
        }

        await musicController.shuffleQueue();
        self.reply(`🔀 Shuffled ${queue.length} tracks in the queue.`);
    } catch (error) {
        logger.error("Error while executing shuffle command", error as Error);

        if (error instanceof MusicPlayerError) {
            self.reply(`❌ ${error.message}`);
        } else {
            self.reply("❌ Failed to shuffle queue.");
        }
    }
}
