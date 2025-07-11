import { createLogger } from "../shared/logging/Logger";

const logger = createLogger('PlayNextCommand');
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
        logger.error('Error while executing playnext command', error as Error);
        return;
    }
}
