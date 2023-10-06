import { GuildControllers } from "../../../src/main";
import { Db } from "mongodb";
import { Express } from "express";
import { DbGuildObject } from "../../db/databaseTypes";
import { EmbedBuilder, TextChannel } from "discord.js";
import { withAuth } from "../middlewares";

export default async function botdizguild(app: Express, db: Db) {
    app.get("/botdizguild/:guildId", withAuth, async (req, res) => {
        try {
            const reqGuildId = req.params.guildId;

            if (!reqGuildId) {
                console.log("No guild Id specified");
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id",
                });
                return;
            }

            const session = req.dbSession;

            if (!session) {
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized",
                });

                return;
            }

            const user = req.user;

            if ("discord_session" in session && "discord_id" in user) {
                const allowedGuilds = user.allowed_guilds;

                let commandAllowed = false;

                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId) {
                        commandAllowed = true;

                        break;
                    }
                }

                if (!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized",
                    });

                    return;
                }
            }

            const replyGuild = (await db.collection("guilds").findOne({ guild_id: reqGuildId })) || {};

            res.send({
                status: "success",
                result: replyGuild,
            });
        } catch (error) {
            console.log("Error while trying to get guild info. Error: ", error);
        }
    });

    app.post("/botdizguild/:guildId", withAuth, async (req, res) => {
        //used for updating guild info only guild admins and owners can do this
        //updates dj roles
        try {
            const reqGuildId = req.params.guildId;

            if (!reqGuildId) {
                console.log("No guild Id specified");
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id",
                });
                return;
            }

            const session = req.dbSession;

            const user = req.user;
            if ("discord_session" in session && "discord_id" in user) {
                const allowedGuilds = user.allowed_guilds;

                let commandAllowed = false;

                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId && (guild.administrator || guild.owner)) {
                        commandAllowed = true;

                        break;
                    }
                }

                if (!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized",
                    });

                    return;
                }
            }

            const djRoles = req.body.dj_roles;

            const dbReply = await db.collection("guilds").updateOne(
                {
                    guild_id: reqGuildId,
                },
                {
                    $set: {
                        dj_roles: djRoles,
                    },
                },
                {
                    upsert: true,
                }
            );

            if (dbReply.upsertedCount > 0 || dbReply.modifiedCount > 0) {
                res.send({
                    status: "success",
                    message: "Updated allowed DJ roles.",
                });

                return;
            } else {
                res.status(404).send({
                    status: "failed",
                    message: "404 Guild not found",
                });

                return;
            }
        } catch (error) {
            console.log("Error while updating guild: ", error);
        }
    });

    app.get("/botdizguild/subscriptions/:guildId", withAuth, async (req, res) => {
        try {
            const reqGuildId = req.params.guildId;

            if (!reqGuildId) {
                console.log("No guild Id specified");
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id",
                });
                return;
            }

            const session = req.dbSession;

            const user = req.user;
            if ("discord_session" in session && "discord_id" in user) {
                const allowedGuilds = user.allowed_guilds;

                let commandAllowed = false;

                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId && (guild.administrator || guild.owner)) {
                        commandAllowed = true;

                        break;
                    }
                }

                if (!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized",
                    });

                    return;
                }
            }

            let guildSubs: DbGuildObject["subscriptions"] = await db
                .collection("guilds")
                .findOne({
                    guild_id: reqGuildId,
                })
                .then((guild) => (guild ? guild.subscriptions : []));

            if (!guildSubs) {
                guildSubs = [];
            }

            res.send({
                status: "success",
                result: guildSubs,
            });
        } catch (error) {
            console.log("Error while trying to get guild subscriptions: ", error);
            res.status(401).send({
                status: "failed",
                message: "Error occured while trying to get guild subscriptions",
            });
        }
    });

    app.post("/botdizguild/subscriptions/:guildId", withAuth, async (req, res) => {
        try {
            const reqGuildId = req.params.guildId;

            if (!reqGuildId) {
                console.log("No guild Id specified");
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id",
                });
                return;
            }

            const session = req.dbSession;

            const user = req.user;

            if ("discord_session" in session && "discord_id" in user) {
                const allowedGuilds = user.allowed_guilds;

                let commandAllowed = false;

                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId && (guild.administrator || guild.owner)) {
                        commandAllowed = true;

                        break;
                    }
                }

                if (!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized",
                    });

                    return;
                }
            }

            let dbSubs = await db
                .collection("guilds")
                .findOne({ guild_id: reqGuildId })
                .then((guild) => guild?.subscriptions);

            if (!dbSubs) {
                dbSubs = [];
            }
            const reqSubType = req.body.type;
            let subFound = false;
            for (const sub of dbSubs) {
                if (sub.type === reqSubType && GuildControllers) {
                    const guild = await GuildControllers.find((element) => element.guildId === reqGuildId)?.guildObj;

                    let subbedChannel;
                    if (guild) {
                        subbedChannel = (await guild.channels.fetch(req.body.subscribed_channel)) as TextChannel;
                    }

                    if (subbedChannel) {
                        const embedMessage = new EmbedBuilder();

                        if (
                            (!sub.active && req.body.active) ||
                            (req.body.active && sub.subscribed_channel !== req.body.subscribed_channel)
                        ) {
                            embedMessage
                                .setColor("#0FF28F")
                                .setTitle("This channel is now subscribed to epic deals")
                                .setTimestamp();
                            subbedChannel.send({ embeds: [embedMessage] });
                        }
                    }

                    subFound = true;
                    sub.subscribed_channel = req.body.subscribed_channel;
                    sub.active = req.body.active;
                }
            }

            if (!subFound) {
                dbSubs.push(req.body);
            }

            const result = await db.collection("guilds").updateOne(
                {
                    guild_id: reqGuildId,
                },
                {
                    $set: {
                        subscriptions: dbSubs,
                    },
                },
                {
                    upsert: true,
                }
            );

            if (result.acknowledged && result.matchedCount > 0) {
                res.send({
                    status: "success",
                    message: "Subscription updated",
                });
            } else {
                throw "Couldn't find guild to update in DB " + reqGuildId;
            }
        } catch (error) {
            console.log("Error while trying to update guild subs: ", error);
            res.status(401).send({
                status: "failed",
                message: "Error occured while trying to update guild subs",
            });
        }
    });
}
