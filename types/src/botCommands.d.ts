import { ApplicationCommandOptionData } from "discord.js";
import { Command } from "./modules/Command";
import { Controller as BotdizGuildContoller } from "./modules/Controller";
export interface BotdizCommand {
    name: string;
    description: string;
    needArgs: boolean;
    usage: string;
    noBind?: boolean;
    ephemeral?: boolean;
    options?: ApplicationCommandOptionData[];
}
export declare const botCommands: (Controller: BotdizGuildContoller) => Command[];
