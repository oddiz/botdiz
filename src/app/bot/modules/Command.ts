import {
    ApplicationCommandData,
    ApplicationCommandOptionData,
    ChatInputCommandInteraction,
    CommandInteraction,
    InteractionReplyOptions,
    InteractionEditReplyOptions,
    Message,
    MessageCreateOptions,
    MessagePayload,
} from "discord.js";
import { PlayCommandOptions } from "../commands/play";
import { botCommands } from "../botCommands";
import type { GuildController } from "core/GuildController";
import { createLogger } from "@logger";
const logger = createLogger("Command");
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

type ReplyContent =
    | string
    | MessagePayload
    | (InteractionReplyOptions & InteractionEditReplyOptions);

export type CommandFunction = (
    invokedMessage?: CommandInteraction | ChatInputCommandInteraction | null,
    options?: PlayCommandOptions | null
) => Promise<void>;
export class Command {
    /*
    config:
        {
            name: help
            description: lists all the commands.
            needArgs: true,
            usage: 
        } 
    inv

    */

    public name: string;
    public description: string;
    public needArgs: boolean;
    public usage: string;
    private noBind: boolean;
    public func;
    public ephemeral: boolean;
    public options: ApplicationCommandOptionData[] | undefined;
    public controller: GuildController;
    public lastInvokedMessage: Message | CommandInteraction | null;
    public lastIsInteraction: boolean | null;

    constructor(controller: GuildController, config: BotdizCommandConfig, func: any) {
        this.controller = controller;

        this.name = config.name;
        this.description = config.description;
        this.needArgs = config.needArgs;
        this.usage = config.usage;
        this.noBind = config.noBind || false;
        this.func = func;
        this.ephemeral = config.ephemeral || false;

        this.options = undefined;
        if (config.options) {
            this.options = config.options;
        }

        this.lastInvokedMessage = null;
        this.lastIsInteraction = null;
    }

    async execute(
        invokedMessage: CommandInteraction | null,
        isInteraction: boolean,
        options?: PlayCommandOptions | null
    ) {
        if (invokedMessage) {
            this.lastInvokedMessage = invokedMessage;
            this.lastIsInteraction = isInteraction;
        }

        if (
            isInteraction &&
            this.lastInvokedMessage instanceof CommandInteraction &&
            !this.lastInvokedMessage.deferred
        ) {
            await this.lastInvokedMessage.deferReply({
                ephemeral: this.ephemeral,
            });
        }

        try {
            if (!this.noBind) {
                const boundFunc = this.func.bind(this);
                boundFunc(invokedMessage, options);
            } else {
                this.func(invokedMessage, options);
            }
        } catch (error) {
            logger.error(`Error while trying to execute command: ${this.name}\n, Error: ${error}`);
        }
    }

    async createNewMessage(
        content: string | MessagePayload | MessageCreateOptions
    ): Promise<Message | null> {
        if (!this.lastInvokedMessage) {
            // no message to reply
            return null;
        }
        const newMessage = content as MessageCreateOptions;
        if (this.lastInvokedMessage.channel && "send" in this.lastInvokedMessage.channel) {
            this.lastInvokedMessage =
                (await this.lastInvokedMessage.channel.send(newMessage)) || null;
        }
        this.lastIsInteraction = false;

        return this.lastInvokedMessage as Message | null;
    }
    async reply(
        content: ReplyContent,
        options: replyOptions = { followup: false, new: false, required: true }
    ): Promise<Message | CommandInteraction | void> {
        try {
            const commands = botCommands;
            if (!this.lastInvokedMessage) {
                // no message to reply
                return;
            }

            if (this.lastIsInteraction && this.lastInvokedMessage instanceof CommandInteraction) {
                //if we have interaction

                if (!this.lastInvokedMessage.deferred && !this.lastInvokedMessage.replied) {
                    return this.lastInvokedMessage.reply(content) as unknown as Promise<Message>;
                }

                //if followup option is passed or found message is deffered but not replied yet
                if (options.followup) {
                    return this.lastInvokedMessage.followUp(content);
                }

                if (options.new) {
                    const newMessage = await this.createNewMessage(
                        content as string | MessagePayload | MessageCreateOptions
                    );
                    if (newMessage) {
                        return newMessage;
                    }
                }

                return await this.lastInvokedMessage.editReply(content).catch(async (err) => {
                    console.log(err + " -> Can't edit Last Invoked Message");

                    if (options.new && options.required) {
                        const newMessage = await this.createNewMessage(
                            content as string | MessagePayload | MessageCreateOptions
                        );
                        if (newMessage) {
                            this.lastInvokedMessage = newMessage;

                            return newMessage;
                        }
                    }
                });
            } else {
                //if normal command
                if (options.required) {
                    const newMessage = await this.createNewMessage(
                        content as string | MessagePayload | MessageCreateOptions
                    );
                    if (newMessage) {
                        return newMessage;
                    }
                }
            }
        } catch (error) {
            console.log("Failed to reply to command: \n" + error);
            return;
        }
    }

    convertSlashCommand(): ApplicationCommandData {
        let command: ApplicationCommandData;

        if (this.options) {
            command = {
                name: this.name,
                description: this.description,
                options: this.options,
            };
        } else {
            command = {
                name: this.name,
                description: this.description,
            };
        }

        return command;
    }
    wrongUsage(
        invokedMessage: CommandInteraction,
        commandName: string,
        errText = "Wrong usage of command! /help to see usage of commands"
    ) {
        //notify chat about the wrong usage
        if (errText !== "") {
            this.reply(`${errText}`);
        }

        //show help of specified command
        const helpCommand = this.controller.getCommandService().getCommand("help");

        if (helpCommand) {
            helpCommand.execute(invokedMessage, false);
        }

        return;
    }
}
