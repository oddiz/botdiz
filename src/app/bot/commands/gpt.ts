import { Command } from "../modules/Command";
import { CommandInteraction } from "discord.js";
import { GptHandler } from "../modules/gptHandler";
import { createLogger } from "@logger";
const allowedGuildIds = ["237628149901426688", "262673200536616960", "1101157784357183620"];
// Hawaii, Hür ve kabul, Botdiz
const logger = createLogger("gptCommand");

export default async function (this: Command, invokedMessage: CommandInteraction) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const gptHandler = new GptHandler();

    try {
        const messageGuildId = invokedMessage.guild?.id;

        if (messageGuildId && allowedGuildIds.includes(messageGuildId)) {
            const invokedChannel = invokedMessage.channel;

            if (!invokedChannel) {
                throw new Error("Channel not found.");
            }
        } else {
            this.reply("This command is only available in select guilds.");
        }
    } catch (error) {
        logger.error("Error while executing gpt command: ", error);
        self.reply("Something went wrong.");
    }
}
