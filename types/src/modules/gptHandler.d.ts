import { Message, TextChannel } from "discord.js";
import OpenAI from "openai";
export declare class GptHandler {
    generateReply(messages: Message<true>[]): Promise<string | null>;
    processMessages(messages: Message<true>[]): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>;
    getMessages(channel: TextChannel): Promise<Message<true>[]>;
    handleMessage(message: Message<boolean>): Promise<void>;
}
