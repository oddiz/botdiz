/* eslint-disable no-magic-numbers */
import "dotenv/config";

import Discord, { Guild, Events, IntentsBitField } from "discord.js";
import { ShoukakuHandler } from "infrastructure/discord/ShokakuHandler";
import { dbManager } from "app/web/server";
import { createLogger } from "@logger";
import { RepositoryManager } from "infrastructure/database/RepositoryManager";
import { GuildManager } from "core/GuildManager";

// Legacy logger import removed - using new createLogger system
export const client = new Discord.Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
    ],
});

const mainLogger = createLogger("Main");

async function main(): Promise<void> {
    try {
        mainLogger.info("Starting Botdiz...");

        // Initialize core services
        const shoukaku = new ShoukakuHandler(client);
        const databaseManager = dbManager;
        const db = await databaseManager.connect();

        if (!db) {
            mainLogger.error("Failed to connect to database");
            process.exit(1);
        }

        const repositories = new RepositoryManager(db);
        const guildManager = new GuildManager(client, repositories, shoukaku);

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

            mainLogger.info("Bot logged in", {
                username: client.user?.username,
                guilds: client.guilds.cache.size,
            });

            // Initialize guild controllers for existing guilds
            await client.guilds.fetch();
            for (const [guildId, guild] of client.guilds.cache) {
                try {
                    await guildManager.addGuild(guild);
                    mainLogger.info("Initialized guild controller", {
                        guildId,
                        guildName: guild.name,
                    });
                } catch (error) {
                    mainLogger.error("Failed to initialize guild controller", error as Error, {
                        guildId,
                        guildName: guild.name,
                    });
                }
            }

            //await updateEpicDeals(db);
            //setInterval(updateEpicDeals, 1000 * 60 * 30, db);

            mainLogger.info("Bot is fully online and ready!");
        });

        // Event handlers
        client.on("debug", (msg) => {
            mainLogger.debug("Discord client debug", { message: msg });
        });

        client.on("warn", (msg) => {
            mainLogger.warn("Discord client warning", { message: msg });
        });

        client.on("error", (error) => {
            mainLogger.error("Discord client error", error);
        });

        // Guild join/leave events
        client.on(Events.GuildCreate, async (guild) => {
            try {
                await guildManager.addGuild(guild);
                mainLogger.info("Bot joined new guild", {
                    guildId: guild.id,
                    guildName: guild.name,
                    memberCount: guild.memberCount,
                });
            } catch (error) {
                mainLogger.error("Failed to initialize controller for new guild", error as Error, {
                    guildId: guild.id,
                    guildName: guild.name,
                });
            }
        });

        client.on(Events.GuildDelete, (guild) => {
            guildManager.removeGuild(guild.id);
            mainLogger.info("Bot left guild", {
                guildId: guild.id,
                guildName: guild.name,
            });
        });

        // Command interactions
        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.guild) return;

            try {
                const controller = guildManager.getController(interaction.guild.id);
                if (!controller) {
                    mainLogger.warn("No controller found for guild interaction", {
                        guildId: interaction.guild.id,
                        guildName: interaction.guild.name,
                    });
                    return;
                }

                if (interaction.isCommand()) {
                    await controller.handleCommand(interaction);
                } else if (interaction.isButton()) {
                    await controller.handleButtonInteraction(interaction);
                }
            } catch (error) {
                mainLogger.error("Failed to handle interaction", error as Error, {
                    guildId: interaction.guild.id,
                    interactionType: interaction.type,
                });
            }
        });

        client.on("rateLimit", (data) => {
            mainLogger.warn("Discord rate limit hit", { data });
        });

        // Login to Discord
        const token =
            process.env.NODE_ENV === "development"
                ? process.env.DISCORD_TESTBOT_TOKEN
                : process.env.DISCORD_TOKEN;

        if (!token) {
            throw new Error("Discord token not found in environment variables");
        }

        await client.login(token);
    } catch (error) {
        mainLogger.error("Failed to start bot", error as Error);
        process.exit(1);
    }
}

main();
