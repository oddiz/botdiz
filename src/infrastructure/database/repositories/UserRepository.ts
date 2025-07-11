import { Db, Filter } from "mongodb";
import { BaseRepository } from "../BaseRepository";
import type { DbUser } from "shared/types/databaseTypes";

export class UserRepository extends BaseRepository<DbUser> {
    constructor(db: Db) {
        super(db, "users");
    }

    async findByUsername(username: string): Promise<DbUser | null> {
        return this.findOne({ username } as Filter<DbUser>);
    }

    // DbUser doesn't have email field - using username for identification

    async createUser(
        username: string,
        hashedPassword: string,
        avatarURL: string = "",
        isAdmin: boolean = false
    ): Promise<DbUser> {
        const userData: Omit<DbUser, "_id"> = {
            username,
            password: hashedPassword,
            avatarURL,
            is_admin: isAdmin,
            data: {
                spotify: {
                    auth_token: "",
                    refresh_token: "",
                    expires_in: 0,
                },
                avatarURL,
                username,
                data: {} as any,
                is_admin: isAdmin,
            },
        };

        return this.create(userData);
    }

    async updatePassword(userId: string, hashedPassword: string): Promise<DbUser> {
        return this.update(userId, {
            password: hashedPassword,
        });
    }

    async updateUserAdmin(userId: string, isAdmin: boolean): Promise<DbUser> {
        return this.update(userId, {
            is_admin: isAdmin,
        });
    }

    async getActiveUsers(): Promise<DbUser[]> {
        return this.findMany({ is_active: true } as Filter<DbUser>);
    }

    async createIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ username: 1 }, { unique: true }),
            this.collection.createIndex({ email: 1 }, { unique: true }),
            this.collection.createIndex({ is_active: 1 }),
            this.collection.createIndex({ created_at: 1 }),
        ]);

        this.logger.info("Created indexes for users collection");
    }

    protected sanitizeForLog(data: any): any {
        const sanitized = super.sanitizeForLog(data);

        // Remove password from logs
        if ("password" in sanitized) {
            sanitized.password = "[REDACTED]";
        }

        return sanitized;
    }
}

export class DiscordUserRepository extends BaseRepository<DbDiscordUser> {
    constructor(db: Db) {
        super(db, "discord_users");
    }

    async findByDiscordId(discordId: string): Promise<DbDiscordUser | null> {
        return this.findOne({ discord_id: discordId } as Filter<DbDiscordUser>);
    }

    async findByUsernameAndDiscriminator(
        username: string,
        discriminator: string
    ): Promise<DbDiscordUser | null> {
        return this.findOne({
            username,
            discriminator,
        } as Filter<DbDiscordUser>);
    }

    async createDiscordUser(discordUserData: {
        discord_id: string;
        username: string;
        avatar?: string | null;
        email: string;
        allowed_guilds: AllowedGuild[];
    }): Promise<DbDiscordUser> {
        const userData: Omit<DbDiscordUser, "_id"> = {
            ...discordUserData,
            password: "", // Discord users don't need passwords
            avatarURL: discordUserData.avatar || "",
            is_admin: false,
            data: {
                spotify: {
                    auth_token: "",
                    refresh_token: "",
                    expires_in: 0,
                },
                avatarURL: discordUserData.avatar || "",
                username: discordUserData.username,
                data: {} as any,
                is_admin: false,
            },
            all_guilds: [],
            avatar: discordUserData.avatar,
        };

        return this.create(userData);
    }

    async updateAllowedGuilds(discordId: string, allowedGuilds: string[]): Promise<DbDiscordUser> {
        return this.update(discordId, {
            allowed_guilds: allowedGuilds,
            updated_at: new Date(),
        });
    }

    async addAllowedGuild(discordId: string, guildId: string): Promise<void> {
        const filter = { discord_id: discordId } as Filter<DbDiscordUser>;
        await this.updateOne(filter, {
            $addToSet: { allowed_guilds: guildId },
            $set: { updated_at: new Date() },
        });
    }

    async removeAllowedGuild(discordId: string, guildId: string): Promise<void> {
        const filter = { discord_id: discordId } as Filter<DbDiscordUser>;
        await this.updateOne(filter, {
            $pull: { allowed_guilds: guildId },
            $set: { updated_at: new Date() },
        });
    }

    async updateDiscordProfile(
        discordId: string,
        profileData: {
            username?: string;
            discriminator?: string;
            avatar?: string;
        }
    ): Promise<DbDiscordUser> {
        return this.update(discordId, {
            ...profileData,
            updated_at: new Date(),
        });
    }

    async getUsersInGuild(guildId: string): Promise<DbDiscordUser[]> {
        return this.findMany({
            allowed_guilds: guildId,
        } as Filter<DbDiscordUser>);
    }

    async createIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ discord_id: 1 }, { unique: true }),
            this.collection.createIndex({ username: 1, discriminator: 1 }),
            this.collection.createIndex({ allowed_guilds: 1 }),
            this.collection.createIndex({ is_active: 1 }),
            this.collection.createIndex({ created_at: 1 }),
        ]);

        this.logger.info("Created indexes for discord_users collection");
    }

    protected sanitizeForLog(data: any): any {
        const sanitized = super.sanitizeForLog(data);

        // Discord users don't have passwords, but we might want to redact other sensitive data
        // For now, no additional sanitization needed

        return sanitized;
    }
}
