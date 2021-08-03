const fetch = require('node-fetch')
const Botdiz = require('../../../src/main')
require('dotenv').config()

function makeImageUrl(guildID, hash, { format = 'webp', size } = {size:128}) {
    const root = "https://cdn.discordapp.com"
    if(hash){
        return `${root}/icons/${guildID}/${hash}.${format}${size ? `?size=${size}` : ''}`;
    } else {
        return 'https://discord.com/assets/f9bb9c4af2b9c32a2c5ee0014661546d.png'
    }
}

module.exports = async function discordguild(app,db) {

    app.get('/discordguilds', async (req, res) => {
        try {
            const reqToken =  req.session.token
            if (!reqToken) {
                console.log("No token info in session (in /discordguilds)")
                return
            }

            const session = await db.collection('sessions').findOne({ token: reqToken})
            
            if (!session) {
                throw "Session not found with token: "+ token 
            }

            const authToken = await getUserDiscordAuth(session)
            
            const botdizGuilds = await Botdiz.client.guilds.cache
            
            const botdizGuildIds = botdizGuilds.map(guild => guild.id)
            let responseUserGuilds = []


            if (authToken === "NOT_DISCORD_SESSION") {
                botdizGuilds.each(guild => {
                    responseUserGuilds.push({
                        id: guild.id,
                        icon: guild.icon,
                        name: guild.name,
                        iconUrl: makeImageUrl(guild.id, guild.icon),
                        administrator: true,
                        botdiz_guild: true
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
                
                if (userGuilds && Array.isArray(userGuilds)) {
                    

                        let allowedGuilds = []
                    for (const guild of userGuilds) {
                        

                        guild.iconUrl = makeImageUrl(guild.id, guild.icon)
                        if (botdizGuildIds.includes(guild.id)) {

                            guild.botdiz_guild = true
                            //if guild exists in botdiz guilds user has administrator permissions to guild they can 
                            if (guild.owner) {
                                guild.owner = true
                                guild.administrator = true
                                responseUserGuilds.push(guild)
                                allowedGuilds.push(guild)

                            } else if ((guild.permissions & 0x8) === 0x8) {
                                guild.administrator = true
                                responseUserGuilds.push(guild)
                                allowedGuilds.push(guild)

                            } else {
                                let djAccess = false
                                const botdizGuildOptions = await db.collection('guilds').findOne(
                                    {
                                        guild_id: guild.id
                                    }
                                )

                                if (botdizGuildOptions) {
                                
                                    const allowedDjRoles = botdizGuildOptions.dj_roles

                                    if ((allowedDjRoles.length > 0)) {
                                        
                                        const discordGuildMemberRoles = await Botdiz.client.guilds.fetch({guild: guild.id})
                                        .then(guild => guild.members.fetch(session.discord_id))
                                        .then(guildMember => guildMember.roles)
                                        .then(guildMemberRoles => guildMemberRoles.cache)
                                        
                                        for (const allowedDjRole of allowedDjRoles){
                                            if(discordGuildMemberRoles.has(allowedDjRole)) {
                                                djAccess = true
                                                guild.dj_access = true
                                                guild.administrator = false
                                                guild.owner = false
                                                responseUserGuilds.push(guild)
                                                allowedGuilds.push(guild)

                                                break
                                            }
                                        }
                                    }
                                }
                                if (!djAccess) {
                                    //user in guild where botdiz is in but neither allowed to music player nor they are admin
                                    guild.dj_access = false
                                    guild.administrator = false 
                                    guild.owner = false 
                                    responseUserGuilds.push(guild)
                                }
                            }
                        } else if((guild.permissions & 0x8) === 0x8) {
                            //guilds that are not botdiz guilds but administrator by user
                            guild.administrator = true
                            guild.botdiz_guild = false
                            responseUserGuilds.push(guild)
                        }
                    }
                    db.collection('discord_users').updateOne(
                        {
                            discord_id: session.discord_id
                        },
                        {
                            $set: {
                                allowed_guilds: allowedGuilds,
                                all_guilds: userGuilds
                            }
                        }
                    )
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

            const session = await db.collection('sessions').findOne(
                {
                    token: token
                }
            )

            if(!session) {
                console.log("Session not found")

                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })

                return
            }

            if(session.discord_session) {
                const user = await db.collection('discord_users').findOne({discord_id: session.discord_id})

                const allowedGuilds = user.allowed_guilds

                let allowed = false
                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId) {
                        allowed = true

                        break
                    }
                }

                if (!allowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized"
                    })

                    return
                }
            }

            const guild = await Botdiz.client.guilds.fetch(reqGuildId)
            const guildRoles = await Botdiz.client.guilds.fetch(reqGuildId).then(guild => guild.roles.fetch())

            const guildRolesArray = []
            for (const [key, role] of guildRoles.entries()) {
                if(!(role.deleted || role.managed)) {
                    const roleObject = {
                        id: role.id,
                        name: role.name,
                        color: role.color.toString(16),
                    }
                    guildRolesArray.push(roleObject)
                } 
            }
            if (guild) {
                res.send({
                    status:"success",
                    result: {
                        guild: guild,
                        roles: guildRolesArray
                    }
                })

            } else {
                res.status(401).send({
                    status: "failed",
                })
            }
        

        } catch (error) {
            console.log("Error while trying to get discord guild : ", error)
            res.status(401).send({
                status:"failed"
            })
        }
    })
    async function getUserDiscordAuth (session) {
        try {
            
        
            
        
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
