import { Command } from "../modules/Command";
import {
    CommandInteraction,
    GuildMember,
    Interaction,
    PermissionFlagsBits,
    TextChannel,
    ChatInputCommandInteraction,
} from "discord.js";
import { createLogger } from "@logger";

const logger = createLogger("clearCommand");
export default async function (this: Command, invokedMessage?: ChatInputCommandInteraction | null) {
    const self = this;
    try {
        if (!invokedMessage) throw "invokedMessage is not defined";

        const guildMember = invokedMessage.member;

        if (guildMember instanceof GuildMember) {
            const deleteAmount = invokedMessage.options.getInteger("amount");
            if (!deleteAmount) {
                return;
            }

            if (!guildMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
                self.reply("You do not have enough permissions to use this command.");

                return;
            }

            if (deleteAmount <= 100 && deleteAmount > 0) {
                const textChannel =
                    invokedMessage.channel instanceof TextChannel ? invokedMessage.channel : null;

                if (textChannel) {
                    await textChannel.bulkDelete(deleteAmount, true).catch((err) => {
                        console.log("Error while trying to bulk delete: ", err);
                    });
                }
            } else {
                self.wrongUsage(
                    invokedMessage,
                    self.name,
                    "Can't delete more than 100 messages or less then 1 (duh)."
                );
            }

            self.reply({ content: `Deleted ${deleteAmount} messages`, ephemeral: true });
        }
    } catch (error) {
        logger.error("Error while executing clear command: ", error);
    }
}
