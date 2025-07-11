import { createLogger } from "@logger";
import { BaseGuildTextChannel, Guild, EmbedBuilder } from "discord.js";
import { Db as MongoDb, WithId, Document } from "mongodb";
import type { DbGuildObject, DbSubscriptionContent } from "shared/types/databaseTypes";

const logger = createLogger("SubscriptionManager");
interface BotdizSubInfo extends DbSubscriptionContent {
    subscribed_channel: string;
    last_posted_content_hash: string;
    last_posted_channel: string;
}

export class SubscriptionManager {
    public db: MongoDb | null;
    public guild: Guild;
    public subscriptions: Map<string, BotdizSubInfo>;
    public stopLoop: boolean;
    public looping: boolean;

    constructor(guild: Guild, db: MongoDb | null) {
        this.guild = guild;
        this.db = db;
        this.subscriptions = new Map();
        this.stopLoop = false;
        this.looping = false;
        /* 
        {
            "epic_deals" : {
                type: "epic_deals",
                subscribed_channel: channelId,
                last_posted_channel: channelId
                last_posted_content_hash: hash,
                current_content_hash: hash
                current_content: [games]

            }
        }
        */
    }

    init = async (dbGuildObject: DbGuildObject) => {
        await this.getGuildSubscriptions(dbGuildObject);

        this.runLoop();
    };

    runLoop = async () => {
        try {
            this.stopLoop = false;

            if (this.looping) {
                console.log("Already looping");
                return;
            }
            this.looping = true;

            while (!this.stopLoop) {
                const dbGuildSubs = await this.getGuildSubscriptions();

                const epicSubObject = await this.subscriptions.get("epic_deals");

                if (epicSubObject) {
                    if (
                        epicSubObject.last_posted_content_hash !==
                            epicSubObject.current_content_hash ||
                        epicSubObject.subscribed_channel !== epicSubObject.last_posted_channel
                    ) {
                        //post new epic message
                        await this.sendEpicDeals(epicSubObject.subscribed_channel).catch(
                            (error) => {
                                if (error === "Channel not found") {
                                    if (dbGuildSubs) {
                                        //deactivate subscription
                                        for (const sub of dbGuildSubs) {
                                            if (sub.type === "epic_deals") {
                                                sub.active = false;
                                            }
                                        }
                                    }
                                }

                                if (this.db !== null) {
                                    //update db
                                    this.db.collection("guilds").updateOne(
                                        {
                                            guild_id: this.guild.id,
                                        },
                                        {
                                            $set: {
                                                subscriptions: dbGuildSubs,
                                            },
                                        },
                                        {
                                            upsert: true,
                                        }
                                    );
                                } else {
                                    logger.error("Database not connected");
                                }

                                return;
                            }
                        );

                        try {
                            if (dbGuildSubs) {
                                for (const sub of dbGuildSubs) {
                                    if (sub.type === "epic_deals") {
                                        sub.last_posted_channel = epicSubObject.subscribed_channel;
                                        sub.last_posted_content_hash =
                                            epicSubObject.current_content_hash;
                                    }
                                }
                            } else {
                                throw new Error("dbGuildSubs is " + dbGuildSubs);
                            }

                            if (this.db !== null) {
                                this.db.collection("guilds").updateOne(
                                    {
                                        guild_id: this.guild.id,
                                    },
                                    {
                                        $set: {
                                            subscriptions: dbGuildSubs,
                                        },
                                    },
                                    {
                                        upsert: true,
                                    }
                                );
                            } else {
                                logger.error("Database not connected");
                            }
                            //update db
                        } catch (error) {
                            console.log("error while trying to update db", error);
                        }
                    }
                }

                await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 10));
            }

            this.looping = false;
            console.log("Subscription loop stopped");

            return;
        } catch (error) {
            console.log("Error while running subs loop: ", error);
            this.looping = false;
            await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 10));
            //try to rerun the loop
            this.runLoop();
        }
    };

    getGuildSubscriptions = async (dbGuildObject?: DbGuildObject) => {
        try {
            let dbGuild;
            if (dbGuildObject) {
                dbGuild = dbGuildObject;
            } else {
                if (this.db !== null) {
                    const guildDoc = await this.db
                        .collection("guilds")
                        .findOne({ guild_id: this.guild.id });
                    dbGuild = guildDoc ? (guildDoc as WithId<Document> & DbGuildObject) : null;
                }
            }

            const dbGuildSubs = dbGuild?.subscriptions;

            /* 
                guildSubs = [
                    {
                        type: "epic_deals",
                        active: true,
                        subscribed_channel: channelId,
                        last_posted_content_hash: hash,
                        current_content_hash: hash
                        current_content: [games]
                    },
                    ..
                ]
            */
            if (!dbGuildSubs || dbGuildSubs.length === 0) {
                this.subscriptions.clear();
            } else if (this.db) {
                for (const sub of dbGuildSubs) {
                    if (sub.active) {
                        const subObject = {
                            subscribed_channel: sub.subscribed_channel,
                            last_posted_content_hash: sub.last_posted_content_hash,
                            last_posted_channel: sub.last_posted_channel,
                        };
                        const subContentDoc = await this.db
                            .collection("subscription_content")
                            .findOne({
                                type: sub.type,
                            });
                        const dbSubContent: DbSubscriptionContent | null = subContentDoc
                            ? (subContentDoc as WithId<Document> & DbSubscriptionContent)
                            : null;

                        if (dbSubContent) {
                            const botdizSubInfo: BotdizSubInfo = {
                                ...subObject,
                                ...dbSubContent,
                            };

                            await this.subscriptions.set(sub.type, botdizSubInfo);
                        }
                    }
                }
            }

            return dbGuildSubs;
        } catch (error) {
            console.log("Error while trying to get guild subscriptions.", error);

            return;
        }
    };

    sendEpicDeals = async (channelId: string) => {
        const epicDealsSub = this.subscriptions.get("epic_deals");

        if (!epicDealsSub) {
            console.log("No epic deal sub found");

            return;
        }

        let textChannel;
        try {
            textChannel = (await this.guild.channels.fetch(channelId)) as BaseGuildTextChannel;
        } catch (error) {
            console.log("Unable to fetch text channel");

            return;
        }

        if (!textChannel) {
            throw "Channel not found";
        }

        const epicGames = epicDealsSub.current_content;
        const activeDeals = [];
        const futureDeals = [];

        /* 
        epicGames = [
            {
                gameTitle: gameTitle,
                isActive: isActive,
                thumbnail: element.keyImages[2].url,
                activateTime?: time
            }
        ]
        */

        for (const epicGame of epicGames) {
            if (epicGame.isActive) {
                //promotion active
                //console.log("Promotion active for: ", epicGame.title)
                if (epicGame.endTime) {
                    const date = new Date();
                    const dateDiff = epicGame.endTime - date.getTime();

                    const seconds = Math.floor((dateDiff / 1000) % 60);
                    const minutes = Math.floor((dateDiff / (1000 * 60)) % 60);
                    const hours = Math.floor((dateDiff / (1000 * 60 * 60)) % 24);
                    const days = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

                    const embedMessage = new EmbedBuilder();

                    embedMessage
                        .setColor("#0FF28F")
                        .setTitle(epicGame.gameTitle)
                        .setThumbnail(epicGame.thumbnail)
                        .setTimestamp()
                        .setDescription(
                            `Free in Epic Store for: **${days} Days** **${hours} Hours** **${minutes} Minutes** **${seconds} Seconds**`
                        );

                    activeDeals.push(embedMessage);
                } else {
                    logger.error(
                        "Epic game is active but no end time found, this is an anomaly and should be looked at. Epic Game object: " +
                            JSON.stringify(epicGame)
                    );
                }
            } else {
                if (epicGame.activateTime) {
                    //promotion not active
                    const effectiveDate = epicGame.activateTime || 0;
                    const date = new Date();
                    const currentDate = date.getTime();

                    const dateDiff = effectiveDate - currentDate;

                    const seconds = Math.floor((dateDiff / 1000) % 60);
                    const minutes = Math.floor((dateDiff / (1000 * 60)) % 60);
                    const hours = Math.floor((dateDiff / (1000 * 60 * 60)) % 24);
                    const days = Math.floor(dateDiff / (1000 * 60 * 60 * 24));
                    //console.log("Days: ", days , "hours: ", hours, "minutes:", minutes, "seconds: ", seconds)

                    let embedMessage = new EmbedBuilder();
                    embedMessage = embedMessage
                        .setColor("#CB462C")
                        .setTitle(epicGame.gameTitle)
                        .setThumbnail(epicGame.thumbnail)
                        .setTimestamp()
                        .setDescription(
                            `Will be free in: **${days} Days** **${hours} Hours** **${minutes} Minutes** **${seconds} Seconds**`
                        );

                    futureDeals.push(embedMessage);
                } else {
                    logger.error(
                        "Epic game is not active but no activate time found, this is an anomaly and should be looked at. Epic Game object: " +
                            JSON.stringify(epicGame)
                    );
                }
            }
        }

        textChannel.send({ embeds: [...activeDeals, ...futureDeals] }).catch((err) => {
            console.log("Error while trying to send epic deals in sub manager: ", err);
        });
    };
}

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
/* 

async function parseEpicDeals (reply) {
    try {
        let epicDealGames
        for (element of reply.data.data.Catalog.searchStore.elements) {
            const effectiveDate = Date.parse(element.effectiveDate)
            const currentDate = new Date().getTime()
            const dateDiff = effectiveDate - currentDate
            const gameTitle = element.title
            const isActive = dateDiff < 0 || (element.promotions && element.promotions.promotionalOffers.length > 0)? true : false
            
            const epicDealObject = {
                gameTitle: gameTitle,
                isActive: isActive,
                thumbnail: element.keyImages[2].url
            }
            
            if (!isActive && !(dateDiff > 1000 * 60 * 60 * 24 * 60)) {
                epicDealObject.activateTime = effectiveDate
            }
            
            epicDealGames.push(epicDealObject)
        }
        
        return epicDealGames
    } catch (error) {
        console.log("error")
    }
}

*/
