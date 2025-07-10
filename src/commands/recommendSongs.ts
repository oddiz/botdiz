import { logger } from "../logger";
import { Command } from "../modules/Command";
export default async function (this: Command) {
    const self = this;
    try {
        const MusicController = self.controller.MusicController;

        if (!MusicController) {
            return;
        }

        MusicController.recommendSongs = !MusicController.recommendSongs;

        self.controller.saveGuildSettings();

        self.reply({ content: `\`Song recommendation is now ${MusicController.recommendSongs ? "on" : "off"}\`` });
    } catch (error) {
        logger.log("error", "Error while executing recommendsongs command: " + error);
    }
}
