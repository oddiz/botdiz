import { createLogger } from "@logger";
import {
    Collection,
    Db,
    WithId,
    Document,
    Filter,
    UpdateFilter,
    InsertOneResult,
    UpdateResult,
    DeleteResult,
} from "mongodb";
import { DatabaseError, NotFoundError } from "shared/errors/BotdizError";

export interface IRepository<T> {
    findById(id: string): Promise<T | null>;
    findOne(filter: Filter<T>): Promise<T | null>;
    findMany(filter: Filter<T>, limit?: number, skip?: number): Promise<T[]>;
    create(entity: Omit<T, "_id">): Promise<T>;
    update(id: string, updates: Partial<T>): Promise<T>;
    updateOne(filter: Filter<T>, updates: UpdateFilter<T>): Promise<UpdateResult>;
    delete(id: string): Promise<boolean>;
    deleteOne(filter: Filter<T>): Promise<boolean>;
    exists(filter: Filter<T>): Promise<boolean>;
    count(filter?: Filter<T>): Promise<number>;
}

export abstract class BaseRepository<T extends Document> implements IRepository<T> {
    protected readonly logger = createLogger(`${this.constructor.name}`);

    constructor(
        protected readonly db: Db,
        protected readonly collectionName: string
    ) {}

    protected get collection(): Collection<T> {
        return this.db.collection<T>(this.collectionName);
    }

    async findById(id: string): Promise<T | null> {
        try {
            const document = await this.collection.findOne({ _id: id } as Filter<T>);
            return document ? this.mapDocument(document) : null;
        } catch (error) {
            this.logger.error("Failed to find document by ID", error as Error, {
                id,
                collection: this.collectionName,
            });
            throw new DatabaseError(`Failed to find document by ID: ${id}`);
        }
    }

    async findOne(filter: Filter<T>): Promise<T | null> {
        try {
            const document = await this.collection.findOne(filter);
            return document ? this.mapDocument(document) : null;
        } catch (error) {
            this.logger.error("Failed to find document", error as Error, {
                filter,
                collection: this.collectionName,
            });
            throw new DatabaseError("Failed to find document");
        }
    }

    async findMany(filter: Filter<T>, limit?: number, skip?: number): Promise<T[]> {
        try {
            let cursor = this.collection.find(filter);

            if (skip) cursor = cursor.skip(skip);
            if (limit) cursor = cursor.limit(limit);

            const documents = await cursor.toArray();
            return documents.map((doc) => this.mapDocument(doc));
        } catch (error) {
            this.logger.error("Failed to find documents", error as Error, {
                filter,
                limit,
                skip,
                collection: this.collectionName,
            });
            throw new DatabaseError("Failed to find documents");
        }
    }

    async create(entity: Omit<T, "_id">): Promise<T> {
        try {
            const result: InsertOneResult = await this.collection.insertOne(entity as T);

            if (!result.insertedId) {
                throw new DatabaseError("Failed to insert document - no ID returned");
            }

            const created = await this.findById(result.insertedId.toString());
            if (!created) {
                throw new DatabaseError("Failed to retrieve created document");
            }

            this.logger.debug("Created document", {
                id: result.insertedId,
                collection: this.collectionName,
            });
            return created;
        } catch (error) {
            this.logger.error("Failed to create document", error as Error, {
                entity: this.sanitizeForLog(entity),
                collection: this.collectionName,
            });
            throw new DatabaseError("Failed to create document");
        }
    }

    async update(id: string, updates: Partial<T>): Promise<T> {
        try {
            const result = await this.collection.updateOne(
                { _id: id } as Filter<T>,
                { $set: updates } as UpdateFilter<T>
            );

            if (result.matchedCount === 0) {
                throw new NotFoundError(`Document not found with ID: ${id}`);
            }

            const updated = await this.findById(id);
            if (!updated) {
                throw new DatabaseError("Failed to retrieve updated document");
            }

            this.logger.debug("Updated document", { id, collection: this.collectionName });
            return updated;
        } catch (error) {
            if (error instanceof NotFoundError) throw error;

            this.logger.error("Failed to update document", error as Error, {
                id,
                updates: this.sanitizeForLog(updates),
                collection: this.collectionName,
            });
            throw new DatabaseError(`Failed to update document: ${id}`);
        }
    }

    async updateOne(filter: Filter<T>, updates: UpdateFilter<T>): Promise<UpdateResult> {
        try {
            const result = await this.collection.updateOne(filter, updates);
            this.logger.debug("Updated documents", {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                collection: this.collectionName,
            });
            return result;
        } catch (error) {
            this.logger.error("Failed to update documents", error as Error, {
                filter,
                updates,
                collection: this.collectionName,
            });
            throw new DatabaseError("Failed to update documents");
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            const result = await this.collection.deleteOne({ _id: id } as Filter<T>);
            const deleted = result.deletedCount > 0;

            this.logger.debug("Deleted document", { id, deleted, collection: this.collectionName });
            return deleted;
        } catch (error) {
            this.logger.error("Failed to delete document", error as Error, {
                id,
                collection: this.collectionName,
            });
            throw new DatabaseError(`Failed to delete document: ${id}`);
        }
    }

    async deleteOne(filter: Filter<T>): Promise<boolean> {
        try {
            const result = await this.collection.deleteOne(filter);
            const deleted = result.deletedCount > 0;

            this.logger.debug("Deleted document", { deleted, collection: this.collectionName });
            return deleted;
        } catch (error) {
            this.logger.error("Failed to delete document", error as Error, {
                filter,
                collection: this.collectionName,
            });
            throw new DatabaseError("Failed to delete document");
        }
    }

    async exists(filter: Filter<T>): Promise<boolean> {
        try {
            const count = await this.collection.countDocuments(filter, { limit: 1 });
            return count > 0;
        } catch (error) {
            this.logger.error("Failed to check document existence", error as Error, {
                filter,
                collection: this.collectionName,
            });
            throw new DatabaseError("Failed to check document existence");
        }
    }

    async count(filter: Filter<T> = {}): Promise<number> {
        try {
            return await this.collection.countDocuments(filter);
        } catch (error) {
            this.logger.error("Failed to count documents", error as Error, {
                filter,
                collection: this.collectionName,
            });
            throw new DatabaseError("Failed to count documents");
        }
    }

    /**
     * Map a MongoDB document to the entity type
     * Override this in subclasses for custom mapping logic
     */
    protected mapDocument(document: WithId<Document>): T {
        return document as WithId<Document> & T;
    }

    /**
     * Sanitize sensitive data before logging
     * Override this in subclasses to remove sensitive fields
     */
    protected sanitizeForLog(data: any): any {
        if (!data || typeof data !== "object") return data;

        const sanitized = { ...data };

        // Remove common sensitive fields
        const sensitiveFields = ["password", "token", "secret", "key", "authorization"];
        sensitiveFields.forEach((field) => {
            if (field in sanitized) {
                sanitized[field] = "[REDACTED]";
            }
        });

        return sanitized;
    }

    /**
     * Create indexes for the collection
     * Override this in subclasses to define collection-specific indexes
     */
    async createIndexes(): Promise<void> {
        // Base implementation does nothing
        // Subclasses should override this to create appropriate indexes
    }
}
