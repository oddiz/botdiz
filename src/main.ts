/* eslint-disable no-magic-numbers */
import "dotenv/config";

import Discord, { Guild, Events, IntentsBitField } from "discord.js";

import { logger } from "./logger";
export const client = new Discord.Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
    ],
});

import { DatabaseManager as DbManager } from "../server_src/db/DatabaseManager";
import { ShoukakuHandler } from "./Shokaku/ShokakuHandler";
import { updateEpicDeals } from "./scripts/updateEpicDeals";

import { Controller as BotdizController } from "./modules/Controller";
import { GptHandler } from "./modules/gptHandler";

export interface GuildController {
    guildId: string;
    guildObj: Guild;
    controller: BotdizController;
}

export const GuildControllers: GuildController[] = [];

async function main(): Promise<void> {
    const shoukaku: ShoukakuHandler = new ShoukakuHandler(client);

    const databaseManager = new DbManager();
    const db = await databaseManager.connect();

    if (!db) {
        logger.log("error", "Failed to connect to database");

        return;
    }

    client.on("ready", async () => {
        if (client.user) {
            client.user.setActivity(`/help`, { type: Discord.ActivityType.Listening });

            if (process.env.NODE_ENV === "development") {
                if (client.user.username !== "botdiz testing [alpha]") {
                    client.user.setUsername("botdiz testing [alpha]");
                }
            } else if (client.user.username !== "botdiz") {
                client.user.setUsername("botdiz");
            }
        }

        await updateEpicDeals(db);
        setInterval(updateEpicDeals, 1000 * 60 * 30, db);
        await client.guilds.fetch();
        for (const guild of client.guilds.cache) {
            const Controller = new BotdizController(db, client, guild[1], shoukaku);

            Controller.init();

            GuildControllers.push({
                guildId: guild[0],
                guildObj: guild[1],
                controller: Controller,
            });
            logger.log("info", `Creating controller for guild: ${guild[1].name}.`);
        }

        logger.log("info", "The bot is online!");
    });
    client.on("debug", (msg) => {
        logger.log("debug", msg);
    });
    client.on("warn", (msg) => {
        logger.log("warn", msg);
    });
    client.on("error", (msg) => {
        logger.log("error", msg);
    });

    client.on("messageCreate", (message) => {
        if (message.interaction) {
            return;
        }
        if (message.guild) {
            const messageGuildId = message.guild.id;
            const guildController = GuildControllers.find(({ guildId }) => guildId === messageGuildId)?.controller;

            if (guildController) {
                new GptHandler().handleMessage(message);
                guildController.handleMessage(message);
            } else {
                logger.log("warn", `No controller found for guild: ${message.guild.name}.`);
            }
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.guild) {
            const messageGuildId = interaction.guild.id;
            const guildController = GuildControllers.find(({ guildId }) => guildId === messageGuildId)?.controller;

            if (guildController) {
                guildController.handleInteraction(interaction);
            } else {
                logger.log("warn", `No controller found for guild: ${interaction.guild.name}.`);
            }
        }
    });

    client.on("rateLimit", (data) => {
        console.error("Rate limit achieved: ");
        console.error(data);
    });

    client.on("guildCreate", async (guild) => {
        const Controller = new BotdizController(db, client, guild, shoukaku);

        await Controller.init();

        GuildControllers.push({
            guildId: guild.id,
            guildObj: guild,
            controller: Controller,
        });
        logger.log("info", `${guild.name} controller added succesfully.`);
    });

    client.on("guildDelete", (guild) => {
        const deletedGuildId = guild.id;

        for (const [index, guildObj] of GuildControllers.entries()) {
            if (guildObj.guildId == deletedGuildId) {
                guildObj.controller.destroy();
                GuildControllers.splice(index, 1);
            }
        }
        logger.log("info", `${guild.name} controller removed.`);
    });

    if (process.env.NODE_ENV == "development") {
        client.login(process.env.DISCORD_TESTBOT_TOKEN);
    } else {
        client.login(process.env.DISCORD_TOKEN);
    }
}

main();
