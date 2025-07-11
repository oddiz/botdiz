import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { Command } from "../modules/Command";
import { createLogger } from "@logger";
const logger = createLogger("helpCommand");

export default function (this: Command, invokedMessage?: ChatInputCommandInteraction | null): void {
    const self = this;
    try {
        if (!invokedMessage) {
            throw new Error("No invoked message");
        }

        const commandName = invokedMessage.options.getString("command");

        let embedMessage = new EmbedBuilder();
        const { PREFIX } = self.controller;
        const userAvatar = self.controller.getClient().user?.avatarURL();

        embedMessage = embedMessage.setColor("#e9b463").setTimestamp();

        if (userAvatar) {
            embedMessage = embedMessage.setThumbnail(userAvatar);
        }
        if (commandName) {
            const foundCommand = self.controller.getCommandService().getCommand(commandName);

            if (foundCommand) {
                embedMessage = embedMessage
                    .setTitle(PREFIX + foundCommand.name)
                    .addFields(
                        { name: "Description", value: foundCommand.description },
                        { name: "Usage", value: foundCommand.usage }
                    );

                self.reply({ embeds: [embedMessage] });

                return;
            }
            self.reply(`Unable to find command: ${PREFIX + commandName}`);

            return;
        }

        embedMessage = embedMessage
            .setTitle("Botdiz Help Menu")
            .setDescription(`Below are all the things Botdiz can do.`)
            .setFooter({ text: `Made with 💜 by oddiz#9659` });

        for (const command of self.controller.getCommandService().getAllCommands()) {
            embedMessage = embedMessage.addFields(
                { name: "\u200B", value: PREFIX + command.name },
                {
                    name: "\u200B",
                    value:
                        "```" +
                        `Description:\n${command.description}\n\nUsage:\n${command.usage}` +
                        "```",
                }
            );
        }

        self.reply({ embeds: [embedMessage] });
    } catch (error) {
        logger.error("Error while executing help command : ", error);
    }
}
