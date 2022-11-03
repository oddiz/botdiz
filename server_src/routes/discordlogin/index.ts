import fetch from "node-fetch";
import crypto from "crypto";
import * as uuid from "uuid";
import { client as DiscordClient } from "../../../src/main";
import { Db } from "mongodb";
import { Express } from "express";

import dotenv from "dotenv";
import { logger } from "../../../src/logger";
import { BotdizSession } from "../../types";
import { makeImageUrl } from "../../scripts/makeImageUrl";
import { DbGuildObject } from "server_src/db/databaseTypes";
dotenv.config();

export default async function playlists(app: Express, db: Db) {
    app.post("/discordlogin", async (req, res) => {
        try {
            const code = req.body?.code;

            let clientId, clientSecret, redirectUri;

            if (process.env.NODE_ENV === "development") {
                if (!process.env.DISCORD_TESTBOT_CLIENT_ID || !process.env.DISCORD_TESTBOT_CLIENT_SECRET) {
                    logger.log("error", "Env variables not set properly!");

                    return;
                }

                clientId = process.env.DISCORD_TESTBOT_CLIENT_ID;
                clientSecret = process.env.DISCORD_TESTBOT_CLIENT_SECRET;
                redirectUri = "http://localhost:3000/discordlogin";
            } else {
                if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
                    logger.log("error", "Env variables not set properly!");

                    return;
                }

                clientId = process.env.DISCORD_CLIENT_ID;
                clientSecret = process.env.DISCORD_CLIENT_SECRET;
                redirectUri = "https://botdiz.kaansarkaya.com/discordlogin";
            }
            if (code) {
                const oauthResult = await fetch("https://discord.com/api/oauth2/token", {
                    method: "POST",
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        grant_type: "authorization_code",
                        redirect_uri: redirectUri,
                    }),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }).then((response) => response.json());

                /* 
                oauthResult = {
                    access_token: 'DxxxxxxxxxxxxxxxxxxxxxxxxxxS',
                    expires_in: 604800,
                    refresh_token: 'axxxxxxxxxxxxxxxxxxxxxxxx06',
                    scope: 'identify email guilds',
                    token_type: 'Bearer'
                }
                */
                if (oauthResult.error) {
                    res.status(401).send({
                        status: "error",
                    });

                    return;
                }
                const accessToken = oauthResult.access_token;
                const refreshToken = oauthResult.refresh_token;
                const expiresIn = oauthResult.expires_in;
                const tokenType = oauthResult.token_type;

                const userResult = await fetch("https://discord.com/api/users/@me", {
                    headers: {
                        authorization: `${tokenType} ${accessToken}`,
                    },
                }).then((response) => response.json());

                /*
                userResult = {
                    id: '2xxxxxxxxxxxxx4',
                    username: 'oxxz',
                    avatar: 'a_39xxxxxxxxxxxxxxc07e6ff749',
                    discriminator: '9xx9',
                    public_flags: 128,
                    flags: 128,
                    banner: null,
                    banner_color: null,
                    accent_color: null,
                    locale: 'en-US',
                    mfa_enabled: true,
                    premium_type: 2,
                    email: 'kxxxxxxxxxa@xxxx.com',
                    verified: true
                }
                */
                const userGuilds = await fetch("https://discord.com/api/users/@me/guilds", {
                    headers: {
                        authorization: `${tokenType} ${accessToken}`,
                    },
                }).then((response) => response.json());

                /* 
                userGuilds= [{
                    id: '85xxxxxxxxxxx904',
                    name: 'Minyatür',
                    icon: '7a4xxxxxxxxxxxxxx8b26a7d',
                    owner: false,
                    permissions: 2147483647,
                    features: [],
                    permissions_new: '274877906943'
                },
                ...
                */

                const passPermissions = [
                    0x8, //ADMINISTRATOR
                    0x10, //MANAGE_CHANNELS
                    0x20, //MANAGE_GUILD
                ];
                let allowedGuilds = [];

                const botdizGuilds = await DiscordClient.guilds.cache;

                const botdizGuildIds = botdizGuilds.map((guild) => guild.id);

                for (const guild of userGuilds) {
                    if (botdizGuildIds.includes(guild.id)) {
                        guild.iconUrl = makeImageUrl(guild.id, guild.icon);
                        //if guild exists in botdiz guilds user has administrator permissions to guild they can
                        if (guild.owner) {
                            guild.owner = true;
                            guild.administrator = true;
                            allowedGuilds.push(guild);
                        } else if ((guild.permissions & 0x8) === 0x8) {
                            guild.administrator = true;
                            allowedGuilds.push(guild);
                        } else {
                            const botdizGuildOptions = (await db.collection("guilds").findOne({
                                guild_id: guild.id,
                            })) as unknown as DbGuildObject;

                            if (botdizGuildOptions) {
                                const allowedDjRoles = botdizGuildOptions.dj_roles;

                                if (!allowedDjRoles) {
                                    //if owner of the guild hasn't set any dj roles, everyone is allowed
                                    guild.dj_access = true;
                                    guild.administrator = false;
                                    guild.owner = false;
                                    allowedGuilds.push(guild);

                                    continue;
                                }
                                if (allowedDjRoles.length > 0) {
                                    const discordGuildMemberRoles = await DiscordClient.guilds
                                        .fetch({ guild: guild.id })
                                        .then((guild) => guild.members.fetch(userResult.id))
                                        .then((guildMember) => guildMember.roles)
                                        .then((guildMemberRoles) => guildMemberRoles.cache);

                                    for (const allowedDjRole of allowedDjRoles) {
                                        if (discordGuildMemberRoles.has(allowedDjRole)) {
                                            guild.dj_access = true;
                                            guild.administrator = false;
                                            guild.owner = false;
                                            allowedGuilds.push(guild);

                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                let avatarURL;
                if (userResult.avatar) {
                    avatarURL = `https://cdn.discordapp.com/avatars/${userResult.id}/${userResult.avatar}`;
                } else {
                    avatarURL = "https://discord.com/assets/3c6ccb83716d1e4fb91d3082f6b21d77.png";
                }

                db.collection("discord_users").updateOne(
                    {
                        discord_id: userResult.id,
                    },
                    {
                        $set: {
                            discord_id: userResult.id,
                            username: userResult.username + "#" + userResult.discriminator,
                            avatarURL: avatarURL,
                            email: userResult.email,
                            avatar: userResult.avatar,
                            allowed_guilds: allowedGuilds || [],
                            all_guilds: userGuilds,
                        },
                    },
                    { upsert: true }
                );

                const id = uuid.v4();
                const token = await crypto.randomBytes(64).toString("hex");

                db.collection("sessions").updateOne(
                    {
                        discord_id: userResult.id,
                    },
                    {
                        $set: {
                            createdAt: new Date(),
                            discord_session: true,
                            discord_id: userResult.id,
                            user_id: id,
                            username: userResult.username + "#" + userResult.discriminator,
                            token: token,
                            discord_auth_token: accessToken,
                            discord_refresh_token: refreshToken,
                            discord_token_expiration: new Date().getTime() + expiresIn * 1000,
                        },
                    },
                    {
                        upsert: true,
                    }
                );
                const reqSession = req.session as BotdizSession;
                reqSession.userId = id;
                reqSession.token = token;
                reqSession.cookie.maxAge = 1000 * 60 * 60 * 24 * 7; //7 days

                if (process.env.NODE_ENV == "development") {
                    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
                } else {
                    res.header("Access-Control-Allow-Origin", "https://botdiz.kaansarkaya.com");
                }
                res.header("Access-Control-Allow-Credentials", "true");
                //console.log(req)

                res.status(200).send({
                    result: "success",
                    message: "Login successfull",
                });

                console.log(userResult.username + "#" + userResult.discriminator + " logged in.");
            }
        } catch (error) {
            logger.log("error", "Error while trying to login via discord: " + error);
            res.status(401).send({
                status: "error",
            });
        }
    });
}
