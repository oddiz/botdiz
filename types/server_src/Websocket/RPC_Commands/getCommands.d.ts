import { AllowedGuild } from "../../db/databaseTypes";
declare const getCommands: {
    [commandName: string]: (allowedGuilds: AllowedGuild[] | "ALL", ...args: string[]) => any;
};
export default getCommands;
