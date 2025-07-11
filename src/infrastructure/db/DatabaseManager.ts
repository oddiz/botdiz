import { createLogger } from "@logger";
import { RepositoryManager } from "infrastructure/database/RepositoryManager";
import { MongoClient, Db } from "mongodb";
import { config } from "shared/config/AppConfig";
import { DatabaseError } from "shared/errors/BotdizError";

export class DatabaseManager {
    private readonly logger = createLogger("DatabaseManager");
    private db: Db | null = null;
    private client: MongoClient | null = null;
    private repositoryManager: RepositoryManager | null = null;
    private isConnected = false;

    constructor() {
        // Configuration is now handled by the config service
    }

    async connect(): Promise<Db | null> {
        if (this.isConnected && this.db) {
            this.logger.warn("Database already connected");
            return this.db;
        }

        try {
            this.logger.info("Connecting to MongoDB database", {
                url: this.maskConnectionString(config.database.url),
                database: config.database.name,
            });

            this.client = new MongoClient(config.database.url);
            await this.client.connect();

            this.db = this.client.db(config.database.name);
            this.isConnected = true;

            this.logger.info("Connected to MongoDB database successfully", {
                database: config.database.name,
            });

            // Initialize repository manager
            this.repositoryManager = new RepositoryManager(this.db);
            await this.repositoryManager.initializeIndexes();

            // Set up connection monitoring
            this.setupConnectionMonitoring();

            return this.db;
        } catch (error) {
            this.logger.error("Failed to connect to database", error as Error, {
                url: this.maskConnectionString(config.database.url),
                database: config.database.name,
            });

            this.isConnected = false;
            return null;
        }
    }

    async disconnect(): Promise<void> {
        if (!this.client) {
            this.logger.warn("No database connection to close");
            return;
        }

        try {
            await this.client.close();
            this.db = null;
            this.client = null;
            this.repositoryManager = null;
            this.isConnected = false;

            this.logger.info("Database connection closed successfully");
        } catch (error) {
            this.logger.error("Error while closing database connection", error as Error);
            throw new DatabaseError("Failed to close database connection");
        }
    }

    getDb(): Db | null {
        return this.db;
    }

    getRepositories(): RepositoryManager {
        if (!this.repositoryManager) {
            throw new DatabaseError(
                "Repository manager not initialized. Ensure database is connected."
            );
        }
        return this.repositoryManager;
    }

    isHealthy(): boolean {
        return this.isConnected && this.db !== null && this.client !== null;
    }

    async checkConnection(): Promise<boolean> {
        if (!this.db) {
            return false;
        }

        try {
            // Ping the database to check connection
            await this.db.admin().ping();
            return true;
        } catch (error) {
            this.logger.error("Database connection check failed", error as Error);
            return false;
        }
    }

    async getConnectionStats(): Promise<{
        isConnected: boolean;
        isHealthy: boolean;
        database: string;
        collections: string[];
    }> {
        const stats = {
            isConnected: this.isConnected,
            isHealthy: this.isHealthy(),
            database: config.database.name,
            collections: [] as string[],
        };

        if (this.db) {
            try {
                const collections = await this.db.listCollections().toArray();
                stats.collections = collections.map((col) => col.name);
            } catch (error) {
                this.logger.error("Failed to list collections", error as Error);
            }
        }

        return stats;
    }

    private setupConnectionMonitoring(): void {
        if (!this.client) return;

        this.client.on("serverOpening", () => {
            this.logger.debug("MongoDB connection opening");
        });

        this.client.on("serverClosed", () => {
            this.logger.warn("MongoDB connection closed");
            this.isConnected = false;
        });

        this.client.on("error", (error) => {
            this.logger.error("MongoDB connection error", error);
            this.isConnected = false;
        });

        this.client.on("timeout", () => {
            this.logger.warn("MongoDB connection timeout");
        });
    }

    private maskConnectionString(url: string): string {
        // Mask credentials in connection string for logging
        return url.replace(/\/\/([^:]+):([^@]+)@/, "//[USER]:[PASSWORD]@");
    }
}

export const dbManager = new DatabaseManager();
