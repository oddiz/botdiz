import { Command } from "../modules/Command";
import { CommandInteraction, GuildMember, PermissionFlagsBits } from "discord.js";
import { createLogger } from "../shared/logging/Logger";

const logger = createLogger('VoteToSkipCommand');

export default async function (this: Command, invokedMessage?: CommandInteraction | null) {
    const self = this;
    
    try {
        if (!invokedMessage) {
            throw new Error("invokedMessage is not defined");
        }

        const user = invokedMessage.member;

        if (user && user instanceof GuildMember) {
            if (
                user.permissions.has(PermissionFlagsBits.Administrator) ||
                user.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
                // TODO: Implement vote-to-skip functionality in the new architecture
                // This feature needs to be added to the guild settings and music controller
                self.reply({
                    content: "`Vote to skip feature is not yet implemented in the new music system. This will be added in a future update.`",
                });
            } else {
                self.reply({ 
                    content: "`Only administrators can change this setting!`" 
                });
            }
        }
    } catch (error) {
        logger.error('Error while executing votetoskip command', error as Error);
        self.reply("`Failed to process vote to skip command.`");
    }
}
