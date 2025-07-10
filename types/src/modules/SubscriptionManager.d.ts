import { Guild } from "discord.js";
import { DbGuildObject, DbSubscriptionContent } from "../../server_src/db/databaseTypes";
import { Db as MongoDb } from "mongodb";
interface BotdizSubInfo extends DbSubscriptionContent {
    subscribed_channel: string;
    last_posted_content_hash: string;
    last_posted_channel: string;
}
export declare class SubscriptionManager {
    db: MongoDb | null;
    guild: Guild;
    subscriptions: Map<string, BotdizSubInfo>;
    stopLoop: boolean;
    looping: boolean;
    constructor(guild: Guild, db: MongoDb | null);
    init: (dbGuildObject: DbGuildObject) => Promise<void>;
    runLoop: () => Promise<void>;
    getGuildSubscriptions: (dbGuildObject?: DbGuildObject) => Promise<any>;
    sendEpicDeals: (channelId: string) => Promise<void>;
}
export {};
/**
 *
 * @param {*} reply
 * @returns [
 *  {
 *      gameTitle: string,
 *      isActive: bool,
 *      activateTime: time in ms
 *  }
 * ]
 */
