
import { client as DiscordClient } from "../../../src/main";
import { makeImageUrl } from "../../scripts/makeImageUrl";
import "dotenv/config";
import { Db } from "mongodb";
import { Express } from "express";
import { DbDiscordSession, DbGuildObject, DbSession } from "../../db/databaseTypes";
import { withAuth } from "../middlewares";

interface BotdizGuild {
    id: string;
    icon: string | null;
    name: string;
    iconUrl: string | null;
    administrator: boolean;
    owner?: boolean;
    botdiz_guild: boolean;
}

export default async function discordguild(app: Express, db: Db) {
    app.get("/discordguilds", withAuth, async (req, res) => {
        try {
            const session = req.dbSession;
            const authToken = await getUserDiscordAuthToken(session);

            const botdizGuilds = await DiscordClient.guilds.cache;

            const botdizGuildIds = botdizGuilds.map((guild) => guild.id);
            const responseUserGuilds: BotdizGuild[] = [];

            if (authToken === "NOT_DISCORD_SESSION") {
                botdizGuilds.each((guild) => {
                    responseUserGuilds.push({
                        id: guild.id,
                        icon: guild.icon,
                        name: guild.name,
                        iconUrl: makeImageUrl(guild.id, guild.icon),
                        administrator: true,
                        botdiz_guild: true,
                    });
                });

                res.send({
                    status: "success",
                    result: responseUserGuilds,
                });

                return;
            }

            const discordSession = session as DbDiscordSession;

            const { default: fetch } = await import("node-fetch");
            const userGuilds = await fetch("https://discord.com/api/users/@me/guilds", {
                headers: {
                    authorization: `Bearer ${authToken}`,
                },
            })
                .then((response) => response.json())
                .catch((err) => {
                    console.log("Error while trying to get user Guilds :", err);
                    return false;
                });

            if (!(userGuilds && Array.isArray(userGuilds))) {
                console.log("userGuilds is undefined or not array. userGuilds: ");
                console.log(userGuilds);
                throw "userGuilds is undefined or not array. userGuilds: ";
            }

            const allowedGuilds = [];
            for (const guild of userGuilds) {
                guild.iconUrl = makeImageUrl(guild.id, guild.icon);

                if (botdizGuildIds.includes(guild.id)) {
                    guild.botdiz_guild = true;
                    //if guild exists in botdiz guilds user has administrator permissions to guild they can
                    if (guild.owner) {
                        guild.owner = true;
                        guild.administrator = true;
                        responseUserGuilds.push(guild);
                        allowedGuilds.push(guild);
                    } else if ((guild.permissions & 0x8) === 0x8) {
                        guild.administrator = true;
                        responseUserGuilds.push(guild);
                        allowedGuilds.push(guild);
                    } else {
                        let djAccess = false;
                        const botdizGuildOptions = (await db.collection("guilds").findOne({
                            guild_id: guild.id,
                        })) as unknown as DbGuildObject | null;

                        if (botdizGuildOptions) {
                            const allowedDjRoles = botdizGuildOptions.dj_roles;

                            if (!allowedDjRoles) {
                                djAccess = true;
                                guild.dj_access = true;
                                guild.administrator = false;
                                guild.owner = false;
                                responseUserGuilds.push(guild);
                                allowedGuilds.push(guild);

                                continue;
                            }

                            if (allowedDjRoles.length > 0) {
                                const discordGuildMemberRoles = await DiscordClient.guilds
                                    .fetch({ guild: guild.id })
                                    .then((guild) => guild.members.fetch(discordSession.discord_id))
                                    .then((guildMember) => guildMember.roles)
                                    .then((guildMemberRoles) => guildMemberRoles.cache);

                                for (const allowedDjRole of allowedDjRoles) {
                                    if (discordGuildMemberRoles.has(allowedDjRole)) {
                                        djAccess = true;
                                        guild.dj_access = true;
                                        guild.administrator = false;
                                        guild.owner = false;
                                        responseUserGuilds.push(guild);
                                        allowedGuilds.push(guild);

                                        break;
                                    }
                                }
                            }
                        }
                        if (!djAccess) {
                            //user in guild where botdiz is in but neither allowed to music player nor they are admin
                            guild.dj_access = false;
                            guild.administrator = false;
                            guild.owner = false;
                            responseUserGuilds.push(guild);
                        }
                    }
                } else if ((guild.permissions & 0x8) === 0x8) {
                    //guilds that are not botdiz guilds but administrator by user
                    guild.administrator = true;
                    guild.botdiz_guild = false;
                    responseUserGuilds.push(guild);
                }
            }
            db.collection("discord_users").updateOne(
                {
                    discord_id: discordSession.discord_id,
                },
                {
                    $set: {
                        allowed_guilds: allowedGuilds,
                        all_guilds: userGuilds,
                    },
                }
            );
            res.send({
                status: "success",
                result: responseUserGuilds,
            });
        } catch (error) {
            console.log("Error while trying to get guilds: ", error);
            res.status(401).send({
                status: "failed",
            });
        }
    });

    app.get("/discordguild/:guild_id", withAuth, async (req, res) => {
        try {
            const reqGuildId = req.params.guild_id;
            if (!reqGuildId) {
                throw "No guild Id supplied with request.";
            }

            const session = req.dbSession;

            if ("discord_session" in session && "discord_id" in req.user) {
                const allowedGuilds = req.user.allowed_guilds;

                let allowed = false;
                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId) {
                        allowed = true;

                        break;
                    }
                }

                if (!allowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized",
                    });

                    return;
                }
            }

            const guild = await DiscordClient.guilds.fetch(reqGuildId);
            const guildRoles = await DiscordClient.guilds.fetch(reqGuildId).then((guild) => guild.roles.fetch());

            const guildRolesArray = [];
            for (const [, role] of guildRoles.entries()) {
                if (!role.managed) {
                    const roleObject = {
                        id: role.id,
                        name: role.name,
                        color: role.color.toString(16),
                    };
                    guildRolesArray.push(roleObject);
                }
            }
            if (guild) {
                res.send({
                    status: "success",
                    result: {
                        guild: guild,
                        roles: guildRolesArray,
                    },
                });
            } else {
                res.status(401).send({
                    status: "failed",
                });
            }
        } catch (error) {
            console.log("Error while trying to get discord guild : ", error);
            res.status(401).send({
                status: "failed",
            });
        }
    });
    async function getUserDiscordAuthToken(session: DbDiscordSession | DbSession): Promise<string | void> {
        try {
            if (!("discord_session" in session)) {
                return "NOT_DISCORD_SESSION";
            }

            const currentTime = new Date();
            let clientId, clientSecret, redirectUri;

            if (currentTime > session.discord_token_expiration) {
                if (process.env.NODE_ENV === "development") {
                    if (!(process.env.DISCORD_TESTBOT_CLIENT_ID && process.env.DISCORD_TESTBOT_CLIENT_SECRET)) {
                        throw "DISCORD_TESTBOT_CLIENT_ID and DISCORD_TESTBOT_CLIENT_SECRET are not defined.";
                    }

                    clientId = process.env.DISCORD_TESTBOT_CLIENT_ID;
                    clientSecret = process.env.DISCORD_TESTBOT_CLIENT_SECRET;
                    redirectUri = "http://localhost:3000/discordlogin";
                } else {
                    if (!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)) {
                        throw "DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET are not defined.";
                    }

                    clientId = process.env.DISCORD_CLIENT_ID;
                    clientSecret = process.env.DISCORD_CLIENT_SECRET;
                    redirectUri = "https://botdiz.kaansarkaya.com/discordlogin";
                }
                const { default: fetch } = await import("node-fetch");
                const oAuthResult = await fetch("https://discord.com/api/oauth2/token", {
                    method: "POST",
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: "refresh_token",
                        refresh_token: session.discord_refresh_token,
                    }),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                })
                    .then((response) => response.json())
                    .catch((err) => {
                        console.log("Error while recieving refresh token ", err);
                    });

                console.log("Discord token refreshed oAuthResult: ", oAuthResult);

                db.collection("sessions").updateOne(
                    {
                        discord_id: session.discord_id,
                    },
                    {
                        discord_auth_token: (oAuthResult as any).access_token,
                        discord_refresh_token: (oAuthResult as any).refresh_token,
                        discord_token_expiration: new Date().getTime() + (oAuthResult as any).expires_in * 1000,
                    }
                );
                return (oAuthResult as any).access_token;
            }

            return session.discord_auth_token;
        } catch (error) {
            console.log("Error in getUserDiscordAuth: ", error);
            return;
        }
    }
}
