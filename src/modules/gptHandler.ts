import { ChannelType, Collection, Message, TextChannel } from "discord.js";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/index.mjs";
import { logger } from "../logger";
const GPT_ALLOWED_CHANNEL_IDS = ["1158274050200719421", "1159299261045948436"];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const systemMessage: ChatCompletionMessageParam = {
    role: "system",
    content: `You are a music discord bot called "botdiz" that was created by "oddiz". He is a 30 year old unemployed medical doctor who is studying for PLAB to migrate to UK. He loves everything about computers. He has recently adopted a female cat called "Lily", he loves his little princess. Try to imitate your creator's personality. 
    
    You will be given chat logs in such format:
    *discord_id*: *message*
    ...

    To mention, reply or ping an user in chat, you have to put "@" before discord_id and put it inside left and right angle brackets (< >). For example discord_id of 241939345290952704 should look like <@241939345290952704> 
    Oddiz's discord_id (your creator) is 241939345290952704 if you'd like to mention him.
    
    You are assisting in a group chat, try to go with the flow.
    `,
};

export class GptHandler {
    public async generateReply(messages: Message<true>[]) {
        const processedMessages = await this.processMessages(messages);
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [systemMessage, ...processedMessages],
            max_tokens: 256,
            temperature: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0,
        });

        return response.choices[0].message.content;
    }
    public async processMessages(messages: Message<true>[]) {
        const processedMessages: ChatCompletionMessageParam[] = [];
        for (const message of messages) {
            let processedMessage: ChatCompletionMessageParam;
            if (message.author.bot) {
                processedMessage = {
                    role: "assistant",
                    content: message.content,
                };
                processedMessages.push(processedMessage);
            } else {
                processedMessage = {
                    role: "user",
                    content: `${message.author.id}: ${message.content}`,
                };
                processedMessages.push(processedMessage);
            }
        }
        return processedMessages.reverse();
    }
    public async getMessages(channel: TextChannel) {
        const tenMinutes = 600000;

        const lastMessages = (await channel.messages.fetch({ limit: 20 })) as Collection<string, Message<true>>;

        // Filter out messages that are older than 10 minutes
        const filteredMessages = Array.from(lastMessages.values()).filter((message) => {
            const messageTimestamp = message.createdTimestamp,
                currentTimestamp = Date.now();

            return currentTimestamp - messageTimestamp < tenMinutes;
        });

        return filteredMessages;
    }

    public async handleMessage(message: Message<boolean>) {
        const guildId = message.guildId;
        const channel = message.channel;

        if (message.author.bot) {
            return;
        }
        if (!guildId || !channel) {
            logger.log("warn", "No guild id or channel");
            return;
        }
        if (channel.type !== ChannelType.GuildText) {
            logger.log("warn", "Not a guild text channel");
            return;
        }
        if (!GPT_ALLOWED_CHANNEL_IDS.includes(channel.id)) {
            logger.log("warn", channel.id);
            logger.log("warn", "Not a gpt allowed channel");
            return;
        }
        rateLimit(async () => {
            const messages = await this.getMessages(channel);
            const response = await this.generateReply(messages);
            if (response) {
                await channel.send(response);
            }
        }, 5000)();
    }
}

function rateLimit<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let lastInvocation = 0;
    let timeout: NodeJS.Timeout | undefined;

    return function (this: any, ...args: Parameters<T>) {
        const now = Date.now();
        if (now - lastInvocation >= delay) {
            fn.apply(this, args);
            lastInvocation = now;
        } else {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                fn.apply(this, args);
                lastInvocation = now;
            }, delay);
        }
    } as T;
}
