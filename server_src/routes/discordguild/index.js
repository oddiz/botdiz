const fetch = require('node-fetch')
const Botdiz = require('../../../src/main')
require('dotenv').config()
module.exports = async function discordguild(app,db) {

    app.get('/discordguilds', async (req, res) => {
        try {
            const reqToken =  req.session.token
            if (!reqToken) {
                console.log("No token info in session (in /discordguilds)")
                return
            }
            const authToken = await getUserDiscordAuth(reqToken)
            
            const botdizGuilds = await Botdiz.client.guilds.cache
            
            const botdizGuildIds = botdizGuilds.map(guild => guild.id)
            let responseUserGuilds = []

            if (authToken === "NOT_DISCORD_SESSION") {
                botdizGuilds.each(guild => {
                    responseUserGuilds.push({
                        id: guild.id,
                        icon: guild.icon,
                        name: guild.name
                    })
                })

                res.send({
                    status: "success",
                    result: responseUserGuilds
                })
            } else {
                const userGuilds = await fetch('https://discord.com/api/users/@me/guilds', {
                    headers: {
                        authorization: `Bearer ${authToken}`,
                    },
                })
                .then(response => response.json())
                .catch(err => { console.log("Error while trying to get user Guilds :", err); return false})
                
                if (userGuilds) {
                    db.collection('discord_users').updateOne(
                        {
                            discord_id: req.session.discord_id
                        },
                        {
                            $set: {
                                all_guilds: userGuilds
                            }
                        }
                    )


                    for (const guild of userGuilds) {
                        if (botdizGuildIds.includes(guild.id)) {
                            guild.botdiz_guild = true
                            //if guild exists in botdiz guilds user has administrator permissions to guild they can 
                            if (guild.owner) {
                                guild.owner = true
                                guild.administrator = true
                                responseUserGuilds.push(guild)

                            } else if ((guild.permissions & 0x8) === 0x8) {
                                guild.administrator = true
                                responseUserGuilds.push(guild)

                            } else {
                                const botdizGuildOptions = await db.collection('guilds').findOne(
                                    {
                                        guild_id: guild.id
                                    }
                                )

                                if (botdizGuildOptions) {
                                
                                    const allowedDjRoles = botdizGuildOptions.dj_roles

                                    if ((allowedDjRoles.length > 0)) {
                                        
                                        const discordGuildMemberRoles = await Botdiz.client.guilds.fetch({guild: guild.id})
                                        .then(guild => guild.members.fetch(userResult.id))
                                        .then(guildMember => guildMember.roles)
                                        .then(guildMemberRoles => guildMemberRoles.cache)
                                        
                                        for (const allowedDjRole of allowedDjRoles){
                                            if(discordGuildMemberRoles.has(allowedDjRole.role_id)) {
                                                guild.dj_access = true
                                                guild.administrator = false
                                                guild.owner = false
                                                responseUserGuilds.push(guild)

                                                break
                                            }
                                        }
                                    }
                                }
                            }
                        } else if((guild.permissions & 0x8) === 0x8) {
                            //guilds that are not botdiz guilds but administrator by user
                            guild.administrator = true
                            guild.botdiz_guild = false
                            responseUserGuilds.push(guild)
                        }
                    }
                    res.send({
                        status: "success",
                        result: responseUserGuilds
                    })
                } else {
                    console.log("userGuilds is undefined.")
                }

            }
        } catch (error) {
            console.log("Error while trying to get guilds: ",error)
            res.status(401).send({
                status: "failed"
            })
        }


    })

    app.post('/discordguild', async (req, res) => {
        try {
            const reqGuildId = req.body.guild_id
            if (!reqGuildId) {
                throw "No guild Id supplied with request."
            }
            const token = req.session.token

            const discordToken = await getUserDiscordAuth(token)

            let guild
            if (discordToken === "NOT_DISCORD_SESSION") {
                guild = await Botdiz.client.guilds.fetch(reqGuildId)

            } else {
                guild = await fetch(`https://discord.com/api/guilds/${reqGuildId}`, {
                    method: "GET",
                    headers: {
                        authorization: `Bearer ${discordToken}`,
                    },
                })
                .then(response => response.json())
                .catch(err => {console.log("Error while trying to get guild: ", err); return false})

                if (guild) {
                    res.send({
                        status:"success",
                        result: guild
                    })

                } else {
                    res.status(401).send({
                        status: "failed",
                    })
                }
            }

        } catch (error) {
            console.log("Error while trying to get discord guild : ", error)
            res.status(401).send({
                status:"failed"
            })
        }
    })
    async function getUserDiscordAuth (token) {
        try {
            const session = await db.collection('sessions').findOne({ token: token})
        
            if (!session) {
                throw "Session not found with token: "+ token 
            }
        
            if (!session.discord_session) {
                return "NOT_DISCORD_SESSION"
            }
        
            const currentTime = new Date().getTime()
        
            if (currentTime > session.discord_token_expiration) {
                if (process.env.NODE_ENV === "development") {
                    clientId = process.env.DISCORD_TESTBOT_CLIENT_ID
                    clientSecret = process.env.DISCORD_TESTBOT_CLIENT_SECRET
                    redirectUri = "http://localhost:3000/discordlogin"
                } else {
                    clientId = process.env.DISCORD_CLIENT_ID
                    clientSecret = process.env.DISCORD_CLIENT_SECRET
                    redirectUri = "https://botdiz.kaansarkaya.com/discordlogin"
                }
                const oAuthResult = await fetch('https://discord.com/api/oauth2/token', {
                    method: "POST",
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: 'refresh_token',
                        refresh_token: session.discord_refresh_token
                    }),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                    
                })
                .then(response => response.json())
                .catch(err => {console.log("Error while recieving refresh token ", err)})
        
                console.log("Discord token refreshed oAuthResult: ", oAuthResult)
        
                db.collection('sessions').updateOne(
                    {
                        discord_id: session.discord_id
                    },
                    {
                        discord_auth_token: oAuthResult.access_token,
                        discord_refresh_token: oAuthResult.refresh_token,
                        discord_token_expiration: new Date().getTime() + (oAuthResult.expires_in * 1000)
                    }
                )
                return oAuthResult.access_token
            }
        
            return session.discord_auth_token
        } catch (error) {
            console.log("Error in getUserDiscordAuth: ", error)
        }
    }
}
