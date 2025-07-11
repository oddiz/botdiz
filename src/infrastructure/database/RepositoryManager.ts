import { Db } from "mongodb";
import { GuildRepository } from "./repositories/GuildRepository";
import { UserRepository, DiscordUserRepository } from "./repositories/UserRepository";
import { SessionRepository, DiscordSessionRepository } from "./repositories/SessionRepository";
import { SubscriptionRepository } from "./repositories/SubscriptionRepository";
import { createLogger } from "@logger";
import { DatabaseError } from "shared/errors/BotdizError";

/**
 * Centralized manager for all database repositories
 * Provides dependency injection and lifecycle management for repositories
 */
export class RepositoryManager {
    private readonly logger = createLogger("RepositoryManager");

    public readonly guilds: GuildRepository;
    public readonly users: UserRepository;
    public readonly discordUsers: DiscordUserRepository;
    public readonly sessions: SessionRepository;
    public readonly discordSessions: DiscordSessionRepository;
    public readonly subscriptions: SubscriptionRepository;

    private readonly repositories: Array<{ name: string; repo: any }>;

    constructor(private readonly db: Db) {
        if (!db) {
            throw new DatabaseError("Database connection is required");
        }

        // Initialize all repositories
        this.guilds = new GuildRepository(db);
        this.users = new UserRepository(db);
        this.discordUsers = new DiscordUserRepository(db);
        this.sessions = new SessionRepository(db);
        this.discordSessions = new DiscordSessionRepository(db);
        this.subscriptions = new SubscriptionRepository(db);

        // Keep track of all repositories for bulk operations
        this.repositories = [
            { name: "guilds", repo: this.guilds },
            { name: "users", repo: this.users },
            { name: "discordUsers", repo: this.discordUsers },
            { name: "sessions", repo: this.sessions },
            { name: "discordSessions", repo: this.discordSessions },
            { name: "subscriptions", repo: this.subscriptions },
        ];

        this.logger.info("Repository manager initialized", {
            repositoryCount: this.repositories.length,
        });
    }

    /**
     * Initialize all database indexes
     * Should be called during application startup
     */
    async initializeIndexes(): Promise<void> {
        this.logger.info("Initializing database indexes");

        const indexPromises = this.repositories.map(async ({ name, repo }) => {
            try {
                if (typeof repo.createIndexes === "function") {
                    await repo.createIndexes();
                    this.logger.debug("Initialized indexes", { repository: name });
                }
            } catch (error) {
                this.logger.error("Failed to initialize indexes", error as Error, {
                    repository: name,
                });
                throw new DatabaseError(
                    `Failed to initialize indexes for ${name}: ${(error as Error).message}`
                );
            }
        });

        await Promise.all(indexPromises);
        this.logger.info("All database indexes initialized successfully");
    }

    /**
     * Get database health statistics
     */
    async getHealthStats(): Promise<{
        isHealthy: boolean;
        collections: Array<{
            name: string;
            documentCount: number;
            isAccessible: boolean;
        }>;
        totalDocuments: number;
    }> {
        const collections = [];
        let totalDocuments = 0;
        let isHealthy = true;

        for (const { name, repo } of this.repositories) {
            try {
                const count = await repo.count();
                collections.push({
                    name,
                    documentCount: count,
                    isAccessible: true,
                });
                totalDocuments += count;
            } catch (error) {
                this.logger.error("Repository health check failed", error as Error, {
                    repository: name,
                });
                collections.push({
                    name,
                    documentCount: 0,
                    isAccessible: false,
                });
                isHealthy = false;
            }
        }

        return {
            isHealthy,
            collections,
            totalDocuments,
        };
    }

    /**
     * Cleanup expired data across all repositories
     */
    async cleanupExpiredData(): Promise<{
        sessionsDeleted: number;
        discordSessionsDeleted: number;
    }> {
        this.logger.info("Starting cleanup of expired data");

        try {
            const [sessionsDeleted, discordSessionsDeleted] = await Promise.all([
                this.sessions.cleanupExpiredSessions(),
                this.discordSessions.cleanupExpiredDiscordSessions(),
            ]);

            this.logger.info("Cleanup completed", {
                sessionsDeleted,
                discordSessionsDeleted,
                totalDeleted: sessionsDeleted + discordSessionsDeleted,
            });

            return {
                sessionsDeleted,
                discordSessionsDeleted,
            };
        } catch (error) {
            this.logger.error("Failed to cleanup expired data", error as Error);
            throw new DatabaseError("Failed to cleanup expired data");
        }
    }

    /**
     * Get comprehensive database statistics
     */
    async getDatabaseStats(): Promise<{
        guildStats: any;
        subscriptionStats: any;
        userCounts: {
            regularUsers: number;
            discordUsers: number;
            activeSessions: number;
            activeDiscordSessions: number;
        };
        healthStats: any;
    }> {
        try {
            const [guildStats, subscriptionStats, healthStats] = await Promise.all([
                this.guilds.getGuildStats(),
                this.subscriptions.getSubscriptionStats(),
                this.getHealthStats(),
            ]);

            const userCounts = {
                regularUsers: await this.users.count({ is_active: true }),
                discordUsers: await this.discordUsers.count({ is_active: true }),
                activeSessions: await this.sessions.count({
                    expires_at: { $gt: new Date() },
                    is_active: true,
                }),
                activeDiscordSessions: await this.discordSessions.count({
                    expires_at: { $gt: new Date() },
                    is_active: true,
                }),
            };

            return {
                guildStats,
                subscriptionStats,
                userCounts,
                healthStats,
            };
        } catch (error) {
            this.logger.error("Failed to get database statistics", error as Error);
            throw new DatabaseError("Failed to get database statistics");
        }
    }

    /**
     * Transaction-like operation for multiple repository operations
     * Note: MongoDB transactions require replica sets, so this is a simple wrapper
     */
    async withTransaction<T>(operations: (repos: RepositoryManager) => Promise<T>): Promise<T> {
        this.logger.debug("Starting repository transaction");

        try {
            const result = await operations(this);
            this.logger.debug("Repository transaction completed successfully");
            return result;
        } catch (error) {
            this.logger.error("Repository transaction failed", error as Error);
            throw error;
        }
    }

    /**
     * Get the underlying database connection
     */
    getDatabase(): Db {
        return this.db;
    }

    /**
     * Check if a specific repository is available
     */
    isRepositoryAvailable(repositoryName: keyof RepositoryManager): boolean {
        const repo = this[repositoryName];
        return repo !== undefined && repo !== null;
    }
}
