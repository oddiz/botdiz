import { MessagePayload, Message, CommandInteraction, InteractionReplyOptions } from "discord.js";
export interface BotdizInteractionReplyOptions {
    followup?: boolean;
    new?: boolean;
    required?: boolean;
    ephemeral?: boolean;
    editReply?: boolean;
}
export default function (invokedMessage: CommandInteraction, content: string | MessagePayload | InteractionReplyOptions, options?: BotdizInteractionReplyOptions): Promise<Message<boolean> | import("discord.js").InteractionResponse<boolean> | undefined>;
