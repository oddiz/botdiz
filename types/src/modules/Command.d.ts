import { ApplicationCommandData, ApplicationCommandOptionData, ChatInputCommandInteraction, CommandInteraction, InteractionReplyOptions, InteractionEditReplyOptions, Message, MessageCreateOptions, MessagePayload } from "discord.js";
import { Controller as BotdizController } from "./Controller";
import { PlayCommandOptions } from "../commands/play";
interface BotdizCommandConfig {
    name: string;
    description: string;
    needArgs: boolean;
    usage: string;
    noBind?: boolean;
    ephemeral?: boolean;
    options?: ApplicationCommandOptionData[];
}
export type replyOptions = {
    followup?: boolean;
    new?: boolean;
    required?: boolean;
};
type ReplyContent = string | MessagePayload | (InteractionReplyOptions & InteractionEditReplyOptions);
export type CommandFunction = (invokedMessage?: CommandInteraction | ChatInputCommandInteraction | null, options?: PlayCommandOptions | null) => Promise<void>;
export declare class Command {
    name: string;
    description: string;
    needArgs: boolean;
    usage: string;
    private noBind;
    func: any;
    ephemeral: boolean;
    options: ApplicationCommandOptionData[] | undefined;
    controller: BotdizController;
    lastInvokedMessage: Message | CommandInteraction | null;
    lastIsInteraction: boolean | null;
    constructor(controller: BotdizController, config: BotdizCommandConfig, func: any);
    execute(invokedMessage: CommandInteraction | null, isInteraction: boolean, options?: PlayCommandOptions | null): Promise<void>;
    createNewMessage(content: string | MessagePayload | MessageCreateOptions): Promise<Message<boolean> | CommandInteraction<import("discord.js").CacheType>>;
    reply(content: ReplyContent, options?: replyOptions): Promise<Message<boolean> | CommandInteraction<import("discord.js").CacheType> | import("discord.js").InteractionResponse<boolean>>;
    convertSlashCommand(): ApplicationCommandData;
    wrongUsage(invokedMessage: CommandInteraction, commandName: string, errText?: string): void;
}
export {};
