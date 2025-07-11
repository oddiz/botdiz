import { Guild, Client as DiscordClient, User, ColorResolvable } from "discord.js";
import { DbGuildObject } from "../../../server_src/db/databaseTypes";
import { createLogger } from "../../shared/logging/Logger";
import { DatabaseError, NotFoundError } from "../../shared/errors/BotdizError";
import { GuildRepository } from "../../infrastructure/database/repositories/GuildRepository";

export interface GuildSettings {
    guildId: string;
    guildName: string;
    ownerId: string;
    djRoles: string[];
    prefix: string;
    roleColor: ColorResolvable;
}

export class GuildService {
    private readonly logger = createLogger('GuildService');

    constructor(
        private readonly guild: Guild,
        private readonly client: DiscordClient,
        private readonly guildRepository: GuildRepository
    ) {}

    async initializeGuild(): Promise<GuildSettings> {
        try {
            this.logger.info('Initializing guild', { guildId: this.guild.id, guildName: this.guild.name });
            
            const dbGuildObject = await this.getOrCreateGuildSettings();
            await this.updateGuildInfoInDatabase();
            
            return {
                guildId: this.guild.id,
                guildName: this.guild.name,
                ownerId: this.guild.ownerId,
                djRoles: dbGuildObject.dj_roles,
                prefix: "/", // Could be configurable from dbGuildObject
                roleColor: this.guild.members.me?.roles?.color?.color || "#e9b463"
            };
        } catch (error) {
            this.logger.error('Failed to initialize guild', error as Error, { guildId: this.guild.id });
            throw new DatabaseError('Failed to initialize guild settings');
        }
    }

    async getOwner(): Promise<User | null> {
        try {
            const app = await this.client.application?.fetch();
            return (app?.owner as User) || null;
        } catch (error) {
            this.logger.error('Failed to fetch bot owner', error as Error);
            return null;
        }
    }

    async updateGuildSettings(updates: Partial<DbGuildObject>): Promise<void> {
        try {
            const guild = await this.guildRepository.findByGuildId(this.guild.id);
            if (!guild) {
                throw new NotFoundError(`Guild not found: ${this.guild.id}`);
            }

            await this.guildRepository.updateOne({ guild_id: this.guild.id } as any, { $set: updates } as any);
            
            this.logger.info('Updated guild settings', { 
                guildId: this.guild.id, 
                updates: Object.keys(updates) 
            });
        } catch (error) {
            this.logger.error('Failed to update guild settings', error as Error, { guildId: this.guild.id });
            throw new DatabaseError('Failed to update guild settings');
        }
    }

    private async getOrCreateGuildSettings(): Promise<DbGuildObject> {
        let guild = await this.guildRepository.findByGuildId(this.guild.id);
            
        if (guild) {
            return guild;
        }

        // Create default guild settings
        const everyoneRole = this.guild.roles.everyone.id;
        guild = await this.guildRepository.createDefaultGuild(
            this.guild.id,
            this.guild.name,
            this.guild.ownerId,
            everyoneRole
        );

        this.logger.info('Created default guild settings', { guildId: this.guild.id });
        return guild;
    }

    private async updateGuildInfoInDatabase(): Promise<void> {
        try {
            await this.guildRepository.updateGuildInfo(
                this.guild.id,
                this.guild.name,
                this.guild.ownerId
            );
        } catch (error) {
            this.logger.error('Failed to update guild info', error as Error, { guildId: this.guild.id });
            // Don't throw here as this is not critical
        }
    }

    getGuild(): Guild {
        return this.guild;
    }

    getClient(): DiscordClient {
        return this.client;
    }

    getGuildRepository(): GuildRepository {
        return this.guildRepository;
    }
}