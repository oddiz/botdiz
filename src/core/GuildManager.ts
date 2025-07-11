import { Guild, Client as DiscordClient } from "discord.js";
import { GuildController } from "./GuildController";
import { createLogger } from "../shared/logging/Logger";
import { NotFoundError } from "../shared/errors/BotdizError";
import { RepositoryManager } from "../infrastructure/database/RepositoryManager";
import type { ShoukakuHandler } from "infrastructure/discord/ShokakuHandler";

/**
 * Centralized manager for all guild controllers
 * Replaces the global GuildControllers array with proper encapsulation
 */
export class GuildManager {
    private readonly logger = createLogger("GuildManager");
    private readonly controllers = new Map<string, GuildController>();

    constructor(
        private readonly client: DiscordClient,
        private readonly repositories: RepositoryManager,
        private readonly shoukaku: ShoukakuHandler
    ) {}

    async addGuild(guild: Guild): Promise<GuildController> {
        if (this.controllers.has(guild.id)) {
            this.logger.warn("Guild controller already exists", { guildId: guild.id });
            return this.controllers.get(guild.id)!;
        }

        this.logger.info("Creating guild controller", {
            guildId: guild.id,
            guildName: guild.name,
        });

        const controller = new GuildController(
            guild,
            this.client,
            this.repositories,
            this.shoukaku
        );

        try {
            await controller.initialize();
            this.controllers.set(guild.id, controller);

            this.logger.info("Guild controller created successfully", {
                guildId: guild.id,
                totalGuilds: this.controllers.size,
            });

            return controller;
        } catch (error) {
            this.logger.error("Failed to create guild controller", error as Error, {
                guildId: guild.id,
            });
            throw error;
        }
    }

    async removeGuild(guildId: string): Promise<void> {
        const controller = this.controllers.get(guildId);

        if (!controller) {
            this.logger.warn("Attempted to remove non-existent guild controller", { guildId });
            return;
        }

        this.logger.info("Removing guild controller", { guildId });

        try {
            await controller.destroy();
            this.controllers.delete(guildId);

            this.logger.info("Guild controller removed successfully", {
                guildId,
                remainingGuilds: this.controllers.size,
            });
        } catch (error) {
            this.logger.error("Failed to properly destroy guild controller", error as Error, {
                guildId,
            });
            // Remove it anyway to prevent memory leaks
            this.controllers.delete(guildId);
        }
    }

    getController(guildId: string): GuildController {
        const controller = this.controllers.get(guildId);

        if (!controller) {
            throw new NotFoundError(`Guild controller not found for guild ${guildId}`);
        }

        return controller;
    }

    getControllerSafe(guildId: string): GuildController | null {
        return this.controllers.get(guildId) || null;
    }

    getAllControllers(): GuildController[] {
        return Array.from(this.controllers.values());
    }

    getGuildIds(): string[] {
        return Array.from(this.controllers.keys());
    }

    getGuildCount(): number {
        return this.controllers.size;
    }

    hasController(guildId: string): boolean {
        return this.controllers.has(guildId);
    }

    async initializeExistingGuilds(): Promise<void> {
        const guilds = this.client.guilds.cache;

        this.logger.info("Initializing controllers for existing guilds", {
            guildCount: guilds.size,
        });

        const initPromises = guilds.map((guild) =>
            this.addGuild(guild).catch((error) => {
                this.logger.error("Failed to initialize guild", error as Error, {
                    guildId: guild.id,
                    guildName: guild.name,
                });
                // Don't throw to prevent one failed guild from stopping all others
            })
        );

        await Promise.allSettled(initPromises);

        this.logger.info("Finished initializing guild controllers", {
            successfulGuilds: this.controllers.size,
            totalGuilds: guilds.size,
        });
    }

    async shutdown(): Promise<void> {
        this.logger.info("Shutting down guild manager", {
            guildCount: this.controllers.size,
        });

        const shutdownPromises = Array.from(this.controllers.entries()).map(
            async ([guildId, controller]) => {
                try {
                    await controller.destroy();
                } catch (error) {
                    this.logger.error("Error during controller shutdown", error as Error, {
                        guildId,
                    });
                }
            }
        );

        await Promise.allSettled(shutdownPromises);
        this.controllers.clear();

        this.logger.info("Guild manager shutdown complete");
    }

    // Statistics and monitoring
    getStats() {
        return {
            totalGuilds: this.controllers.size,
            guilds: Array.from(this.controllers.entries()).map(([guildId, controller]) => ({
                guildId,
                guildName: controller.getGuild().name,
                memberCount: controller.getGuild().memberCount,
            })),
        };
    }
}
