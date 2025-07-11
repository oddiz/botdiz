import { Db, Filter } from "mongodb";
import { BaseRepository } from "../BaseRepository";
import type { DbSession } from "shared/types/databaseTypes";

export class SessionRepository extends BaseRepository<DbSession> {
    constructor(db: Db) {
        super(db, "sessions");
    }

    async findByToken(token: string): Promise<DbSession | null> {
        return this.findOne({ token } as Filter<DbSession>);
    }

    async findByUsername(username: string): Promise<DbSession[]> {
        return this.findMany({ username } as Filter<DbSession>);
    }

    async createSession(username: string, token: string, expiresAt?: Date): Promise<DbSession> {
        const sessionData: Omit<DbSession, "_id"> = {
            username,
            token,
            created_at: new Date(),
            expires_at: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
            is_active: true,
        };

        return this.create(sessionData);
    }

    async revokeSession(token: string): Promise<boolean> {
        return this.deleteOne({ token } as Filter<DbSession>);
    }

    async revokeAllUserSessions(username: string): Promise<number> {
        const result = await this.collection.deleteMany({ username } as Filter<DbSession>);
        return result.deletedCount;
    }

    async cleanupExpiredSessions(): Promise<number> {
        const result = await this.collection.deleteMany({
            expires_at: { $lt: new Date() },
        } as Filter<DbSession>);

        this.logger.info("Cleaned up expired sessions", { deletedCount: result.deletedCount });
        return result.deletedCount;
    }

    async extendSession(token: string, newExpiryDate: Date): Promise<DbSession> {
        const filter = { token } as Filter<DbSession>;
        await this.updateOne(filter, {
            $set: { expires_at: newExpiryDate },
        });

        const updated = await this.findByToken(token);
        if (!updated) {
            throw new Error("Failed to retrieve extended session");
        }

        return updated;
    }

    async createIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ token: 1 }, { unique: true }),
            this.collection.createIndex({ username: 1 }),
            this.collection.createIndex({ expires_at: 1 }),
            this.collection.createIndex({ created_at: 1 }),
            this.collection.createIndex({ is_active: 1 }),
        ]);

        this.logger.info("Created indexes for sessions collection");
    }

    protected sanitizeForLog(data: any): any {
        const sanitized = super.sanitizeForLog(data);

        // Redact the token from logs
        if ("token" in sanitized) {
            sanitized.token = "[REDACTED]";
        }

        return sanitized;
    }
}

export class DiscordSessionRepository extends BaseRepository<DbDiscordSession> {
    constructor(db: Db) {
        super(db, "sessions"); // Same collection as regular sessions
    }

    async findByToken(token: string): Promise<DbDiscordSession | null> {
        // Find sessions that have discord_session property
        const session = await this.findOne({
            token,
            discord_session: { $exists: true },
        } as Filter<DbDiscordSession>);

        return session;
    }

    async findByDiscordId(discordId: string): Promise<DbDiscordSession[]> {
        return this.findMany({ discord_id: discordId } as Filter<DbDiscordSession>);
    }

    async createDiscordSession(
        discordId: string,
        token: string,
        discordSession: any,
        expiresAt?: Date
    ): Promise<DbDiscordSession> {
        const sessionData: Omit<DbDiscordSession, "_id"> = {
            discord_id: discordId,
            token,
            discord_session: discordSession,
            created_at: new Date(),
            expires_at: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
            is_active: true,
        };

        return this.create(sessionData);
    }

    async updateDiscordSession(token: string, discordSession: any): Promise<DbDiscordSession> {
        const filter = { token } as Filter<DbDiscordSession>;
        await this.updateOne(filter, {
            $set: {
                discord_session: discordSession,
                updated_at: new Date(),
            },
        });

        const updated = await this.findByToken(token);
        if (!updated) {
            throw new Error("Failed to retrieve updated Discord session");
        }

        return updated;
    }

    async revokeDiscordSession(token: string): Promise<boolean> {
        return this.deleteOne({
            token,
            discord_session: { $exists: true },
        } as Filter<DbDiscordSession>);
    }

    async revokeAllUserDiscordSessions(discordId: string): Promise<number> {
        const result = await this.collection.deleteMany({
            discord_id: discordId,
        } as Filter<DbDiscordSession>);

        return result.deletedCount;
    }

    async cleanupExpiredDiscordSessions(): Promise<number> {
        const result = await this.collection.deleteMany({
            discord_session: { $exists: true },
            expires_at: { $lt: new Date() },
        } as Filter<DbDiscordSession>);

        this.logger.info("Cleaned up expired Discord sessions", {
            deletedCount: result.deletedCount,
        });
        return result.deletedCount;
    }

    async createIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ token: 1, discord_session: 1 }, { unique: true }),
            this.collection.createIndex({ discord_id: 1 }),
            this.collection.createIndex({ expires_at: 1 }),
            this.collection.createIndex({ created_at: 1 }),
            this.collection.createIndex({ "discord_session.access_token": 1 }),
        ]);

        this.logger.info("Created indexes for Discord sessions");
    }

    protected sanitizeForLog(data: any): any {
        const sanitized = super.sanitizeForLog(data);

        // Redact sensitive Discord session data
        if ("token" in sanitized) {
            sanitized.token = "[REDACTED]";
        }

        if ("discord_session" in sanitized && sanitized.discord_session) {
            sanitized.discord_session = {
                ...sanitized.discord_session,
                access_token: "[REDACTED]",
                refresh_token: "[REDACTED]",
            };
        }

        return sanitized;
    }
}
