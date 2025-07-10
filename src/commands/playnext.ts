import { logger } from "../logger";
import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../modules/Command";
import play from "./play";

export default async function (this: Command, invokedMessage?: ChatInputCommandInteraction | null) {
    try {
        const self = this;
        const boundPlay = play.bind(self);

        boundPlay(invokedMessage, { forceNext: true });

        return;
    } catch (error) {
        logger.log("error", "Error while executing playnext command: ", error);
        return;
    }
}
