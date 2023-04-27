import Discord from "discord.js";
export declare const client: Discord.Client<boolean>;
import { Guild } from "discord.js";
import { Controller as BotdizController } from "./modules/Controller";
export interface GuildController {
    guildId: string;
    guildObj: Guild;
    controller: BotdizController;
}
export declare const GuildControllers: GuildController[];
