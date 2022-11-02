import { Interaction, MessagePayload, TextChannel, Message, MessageOptions, MessageEditOptions } from "discord.js";
import { logger } from "../logger";
export interface InteractionReplyOptions {
    followup?: boolean;
    new?: boolean;
    required?: boolean;
    ephemeral?: boolean;
    editReply?: boolean;
}

export default async function (
    invokedMessage: Interaction,
    content: string | MessagePayload,
    options: InteractionReplyOptions = {
        followup: false,
        new: false,
        required: false,
        ephemeral: false,
        editReply: false,
    }
): Promise<void | Message<boolean>> {
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
            return await lastInvokedChannel.send(content);
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
                    return (await invokedMessage.editReply(content)) as Message;
                } else if (options.followup) {
                    return (await invokedMessage.followUp(content)) as Message;
                } else if (options.new) {
                    return await invokedMessage.channel?.send(content);
                } else {
                    return await invokedMessage.channel?.send(content);
                }
            }
        } else {
            //if normal command
            if (options.required) {
                return await invokedMessage.channel?.send(content);
            }
        }
    } catch (error) {
        logger.log("error", "Failed to reply to command: \n" + error);
    }
}
