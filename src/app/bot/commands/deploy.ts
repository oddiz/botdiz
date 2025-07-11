import { createLogger } from "@logger";
import type { Command } from "app/bot/modules/Command";
import { CommandInteraction } from "discord.js";

const logger = createLogger("deployCommand");
export default async function (this: Command, invokedMessage: CommandInteraction) {
    const self = this;
    try {
        const guildOwner = await invokedMessage.guild?.fetchOwner();

        const guildOwnerId = guildOwner?.user.id;

        if (!guildOwnerId) {
            logger.error("Could not get guild owner id.");
            return;
        }

        let messageUserId;

        if (self.lastIsInteraction) {
            messageUserId = invokedMessage.user.id;
        }

        const botOwner = await self.controller.getGuildService().getOwner();

        if (messageUserId == botOwner?.id || messageUserId == guildOwnerId) {
            let slashCommands = [];

            for (const command of self.controller.getCommandService().getAllCommands()) {
                slashCommands.push(command.convertSlashCommand());
            }

            await invokedMessage.guild?.commands.set(slashCommands);

            self.reply("Slash commands are registered!");

            return;
        } else {
            self.reply("You cannot use this command. Needs to be guild owner or goddiz");
            return;
        }
    } catch (error) {
        logger.error("Error while executing deploy command: ", error);
    }
}
