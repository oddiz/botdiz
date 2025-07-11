import { Db, Filter } from "mongodb";
import { BaseRepository } from "../BaseRepository";
import type { DbSubscriptionContent } from "shared/types/databaseTypes";

export class SubscriptionRepository extends BaseRepository<DbSubscriptionContent> {
    constructor(db: Db) {
        super(db, "subscription_content");
    }

    async findByType(type: string): Promise<DbSubscriptionContent | null> {
        return this.findOne({ type } as Filter<DbSubscriptionContent>);
    }

    async findActiveSubscriptions(): Promise<DbSubscriptionContent[]> {
        return this.findMany({
            is_active: true,
        } as Filter<DbSubscriptionContent>);
    }

    async createSubscriptionContent(data: {
        type: string;
        current_content: any[];
        current_content_hash: string;
        next_update_time: Date;
        update_interval_ms?: number;
    }): Promise<DbSubscriptionContent> {
        const subscriptionData: Omit<DbSubscriptionContent, "_id"> = {
            ...data,
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true,
            update_interval_ms: data.update_interval_ms || 3600000, // 1 hour default
        };

        return this.create(subscriptionData);
    }

    async updateContent(
        type: string,
        newContent: any[],
        newHash: string,
        nextUpdateTime: Date
    ): Promise<DbSubscriptionContent> {
        const filter = { type } as Filter<DbSubscriptionContent>;
        await this.updateOne(filter, {
            $set: {
                current_content: newContent,
                current_content_hash: newHash,
                next_update_time: nextUpdateTime,
                last_update_time: new Date(),
                updated_at: new Date(),
            },
        });

        const updated = await this.findByType(type);
        if (!updated) {
            throw new Error("Failed to retrieve updated subscription content");
        }

        return updated;
    }

    async updateNextUpdateTime(type: string, nextUpdateTime: Date): Promise<void> {
        const filter = { type } as Filter<DbSubscriptionContent>;
        await this.updateOne(filter, {
            $set: {
                next_update_time: nextUpdateTime,
                updated_at: new Date(),
            },
        });
    }

    async getSubscriptionsDueForUpdate(): Promise<DbSubscriptionContent[]> {
        return this.findMany({
            is_active: true,
            next_update_time: { $lte: new Date() },
        } as Filter<DbSubscriptionContent>);
    }

    async deactivateSubscription(type: string): Promise<DbSubscriptionContent> {
        const filter = { type } as Filter<DbSubscriptionContent>;
        await this.updateOne(filter, {
            $set: {
                is_active: false,
                updated_at: new Date(),
            },
        });

        const updated = await this.findByType(type);
        if (!updated) {
            throw new Error("Failed to retrieve deactivated subscription");
        }

        return updated;
    }

    async reactivateSubscription(type: string): Promise<DbSubscriptionContent> {
        const filter = { type } as Filter<DbSubscriptionContent>;
        await this.updateOne(filter, {
            $set: {
                is_active: true,
                updated_at: new Date(),
            },
        });

        const updated = await this.findByType(type);
        if (!updated) {
            throw new Error("Failed to retrieve reactivated subscription");
        }

        return updated;
    }

    async getSubscriptionStats(): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
        subscriptionTypes: string[];
        nextUpdateTimes: Array<{ type: string; nextUpdate: Date }>;
    }> {
        const totalSubscriptions = await this.count();
        const activeSubscriptions = await this.count({
            is_active: true,
        } as Filter<DbSubscriptionContent>);

        const allSubs = await this.findMany({} as Filter<DbSubscriptionContent>);
        const subscriptionTypes = allSubs.map((sub) => sub.type);
        const nextUpdateTimes = allSubs
            .filter((sub) => sub.is_active)
            .map((sub) => ({
                type: sub.type,
                nextUpdate: sub.next_update_time,
            }))
            .sort((a, b) => a.nextUpdate.getTime() - b.nextUpdate.getTime());

        return {
            totalSubscriptions,
            activeSubscriptions,
            subscriptionTypes,
            nextUpdateTimes,
        };
    }

    async createIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ type: 1 }, { unique: true }),
            this.collection.createIndex({ is_active: 1 }),
            this.collection.createIndex({ next_update_time: 1 }),
            this.collection.createIndex({ current_content_hash: 1 }),
            this.collection.createIndex({ created_at: 1 }),
            this.collection.createIndex({ last_update_time: 1 }),
        ]);

        this.logger.info("Created indexes for subscription_content collection");
    }

    protected sanitizeForLog(data: any): any {
        const sanitized = super.sanitizeForLog(data);

        // Subscription content might be large, so we'll truncate it for logs
        if ("current_content" in sanitized && Array.isArray(sanitized.current_content)) {
            sanitized.current_content = `[Array with ${sanitized.current_content.length} items]`;
        }

        return sanitized;
    }
}
