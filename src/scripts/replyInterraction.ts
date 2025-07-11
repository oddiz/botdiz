import { MessagePayload, TextChannel, Message, CommandInteraction, InteractionReplyOptions } from "discord.js";
import { logger } from "../logger";
export interface BotdizInteractionReplyOptions {
    followup?: boolean;
    new?: boolean;
    required?: boolean;
    ephemeral?: boolean;
    editReply?: boolean;
}

export default async function (
    invokedMessage: CommandInteraction,
    content: string | MessagePayload | InteractionReplyOptions,
    options: BotdizInteractionReplyOptions = {
        followup: false,
        new: false,
        required: false,
        ephemeral: false,
        editReply: false,
    }
) {
    try {
        if (!invokedMessage) {
            // no message to reply
            return;
        }

        //check if invoked message is still there
        const lastInvokedChannel = await invokedMessage?.channel?.fetch(true);
        if (!lastInvokedChannel || !(lastInvokedChannel instanceof TextChannel)) {
            return;
        }
        const foundMessage = await lastInvokedChannel.messages.fetch(invokedMessage.id);

        //if not there send normal message and return
        if (!foundMessage) {
            const messageContent = content as MessagePayload;
            return await lastInvokedChannel.send(messageContent);
        }

        if (invokedMessage.isCommand()) {
            //if we have interaction

            if (!invokedMessage.deferred) {
                //if not deferred, defer it
                await invokedMessage.deferReply();
            }

            //if message is  not replied yet
            if (!invokedMessage.replied) {
                return await invokedMessage.reply(content);
            } else {
                if (options.editReply) {
                    const editContent = content as string | MessagePayload;
                    return await invokedMessage.editReply(editContent);
                } else if (options.followup) {
                    return await invokedMessage.followUp(content);
                } else if (options.new) {
                    const messageContent = content as string | MessagePayload;
                    if (invokedMessage.channel && 'send' in invokedMessage.channel) {
                        return await invokedMessage.channel.send(messageContent);
                    }
                } else {
                    const messageContent = content as string | MessagePayload;
                    if (invokedMessage.channel && 'send' in invokedMessage.channel) {
                        return await invokedMessage.channel.send(messageContent);
                    }
                }
            }
        } else {
            //if normal command
        }
    } catch (error) {
        logger.log("error", "Failed to reply to command: \n" + error);
    }
}
