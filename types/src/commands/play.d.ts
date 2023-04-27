import { Command } from "../modules/Command";
import { ChatInputCommandInteraction } from "discord.js";
export declare type PlayCommandOptions = {
    query?: string | null;
    forceNext?: boolean;
};
export default function (this: Command, invokedMessage?: ChatInputCommandInteraction | null, options?: PlayCommandOptions | null): Promise<void>;
