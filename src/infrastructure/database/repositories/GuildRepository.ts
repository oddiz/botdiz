import { Db, Filter } from "mongodb";
import { BaseRepository } from "../BaseRepository";
import type { DbGuildObject } from "shared/types/databaseTypes";

export class GuildRepository extends BaseRepository<DbGuildObject> {
    constructor(db: Db) {
        super(db, "guilds");
    }

    async findByGuildId(guildId: string): Promise<DbGuildObject | null> {
        return this.findOne({ guild_id: guildId } as Filter<DbGuildObject>);
    }

    async findByOwnerId(ownerId: string): Promise<DbGuildObject[]> {
        return this.findMany({ owner_id: ownerId } as Filter<DbGuildObject>);
    }

    async updateGuildInfo(
        guildId: string,
        guildName: string,
        ownerId: string
    ): Promise<DbGuildObject> {
        const filter = { guild_id: guildId } as Filter<DbGuildObject>;
        const updates = {
            guild_name: guildName,
            owner_id: ownerId,
            updated_at: new Date(),
        };

        await this.updateOne(filter, { $set: updates });

        const updated = await this.findByGuildId(guildId);
        if (!updated) {
            throw new Error("Failed to retrieve updated guild");
        }

        return updated;
    }

    async addDjRole(guildId: string, roleId: string): Promise<void> {
        const filter = { guild_id: guildId } as Filter<DbGuildObject>;
        await this.updateOne(filter, {
            $addToSet: { dj_roles: roleId },
        });
    }

    async removeDjRole(guildId: string, roleId: string): Promise<void> {
        const filter = { guild_id: guildId } as Filter<DbGuildObject>;
        await this.updateOne(filter, {
            $pull: { dj_roles: roleId },
        });
    }

    async createDefaultGuild(
        guildId: string,
        guildName: string,
        ownerId: string,
        everyoneRoleId: string
    ): Promise<DbGuildObject> {
        const guildData: Omit<DbGuildObject, "_id"> = {
            guild_id: guildId,
            guild_name: guildName,
            owner_id: ownerId,
            dj_roles: [everyoneRoleId],
            created_at: new Date(),
            updated_at: new Date(),
        };

        return this.create(guildData);
    }

    async getGuildStats(): Promise<{
        totalGuilds: number;
        guildsWithSubscriptions: number;
        averageDjRoles: number;
    }> {
        const totalGuilds = await this.count();

        // Count guilds with subscriptions
        const guildsWithSubscriptions = await this.count({
            subscriptions: { $exists: true, $not: { $size: 0 } },
        } as Filter<DbGuildObject>);

        // Calculate average DJ roles (using aggregation)
        const pipeline = [
            {
                $project: {
                    djRoleCount: { $size: { $ifNull: ["$dj_roles", []] } },
                },
            },
            {
                $group: {
                    _id: null,
                    averageDjRoles: { $avg: "$djRoleCount" },
                },
            },
        ];

        const aggregationResult = await this.collection.aggregate(pipeline).toArray();
        const averageDjRoles = aggregationResult[0]?.averageDjRoles || 0;

        return {
            totalGuilds,
            guildsWithSubscriptions,
            averageDjRoles: Math.round(averageDjRoles * 100) / 100,
        };
    }

    async createIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ guild_id: 1 }, { unique: true }),
            this.collection.createIndex({ owner_id: 1 }),
            this.collection.createIndex({ created_at: 1 }),
            this.collection.createIndex({ "subscriptions.type": 1 }),
        ]);

        this.logger.info("Created indexes for guilds collection");
    }

    protected sanitizeForLog(data: any): any {
        const sanitized = super.sanitizeForLog(data);

        // No additional sensitive fields for guilds currently
        // but we could add logic to redact sensitive guild settings

        return sanitized;
    }
}
