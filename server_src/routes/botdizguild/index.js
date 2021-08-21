const Botdiz = require('../../../src/main')


module.exports = async function botdizguild(app,db) {

    app.get('/botdizguild/:guildId', async (req, res) => {

        try {

            const reqGuildId = req.params.guildId

            if(!reqGuildId) {
                console.log("No guild Id specified")
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id"
                })
                return
            }

            const token = req.session.token
    
            if(!token) {
                console.log("No token info in session (in /guildinfo)")
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
    
                return
            }
    
            const session = await db.collection('sessions').findOne({token: token})
    
            if(!session) {
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
            }
    
            if (session.discord_session) {
                const user = await db.collection('discord_users').findOne({discord_id: session.discord_id})
                
                const allowedGuilds = user.allowed_guilds

                let commandAllowed = false;

                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId) {
                        commandAllowed = true

                        break
                    }
                }

                if(!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized"
                    })

                    return
                }
            }


            let replyGuild = await db.collection('guilds').findOne({ guild_id: reqGuildId })

            if (!replyGuild) {
                replyGuild = {}
            }

            res.send({
                status:"success",
                result: replyGuild
            })
    
                
            
        } catch (error) {
            console.log("Error while trying to get guild info. Error: ", error)
        }

    })

    app.post('/botdizguild/:guildId', async (req, res) => {

        try {

            const reqGuildId = req.params.guildId

            if(!reqGuildId) {
                console.log("No guild Id specified")
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id"
                })
                return
            }

            const token = req.session.token
    
            if(!token) {
                console.log("No token info in session (in /guildinfo)")
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
    
                return
            }
    
            const session = await db.collection('sessions').findOne({token: token})
    
            if(!session) {
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
            }
    
            if (session.discord_session) {
                const user = await db.collection('discord_users').findOne({discord_id: session.discord_id})
                
                const allowedGuilds = user.allowed_guilds

                let commandAllowed = false;

                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId && (guild.administrator || guild.owner)) {
                        commandAllowed = true

                        break
                    }
                }

                if(!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized"
                    })

                    return
                }
            }

            const djRoles = req.body.dj_roles


            const dbReply = await db.collection('guilds').updateOne(
                {
                    guild_id: reqGuildId
                },
                {
                    $set: {
                        dj_roles: djRoles
                    }
                },
                {
                    upsert: true
                }
            )

            if(dbReply.result.ok) {
                res.send({
                    status:"success",
                    message: "Updated allowed DJ roles."
                })
            } else {
                res.status(401).send({
                    status:"failed"
                })
            }


        } catch (error) {
            console.log("Error while updating guild: ", error)
        }
    })

    app.get('/botdizguild/subscriptions/:guildId', async (req, res) => {

        try {
            const reqGuildId = req.params.guildId

            if(!reqGuildId) {
                console.log("No guild Id specified")
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id"
                })
                return
            }

            const token = req.session.token
    
            if(!token) {
                console.log("No token info in session (in /guildinfo)")
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
    
                return
            }
    
            const session = await db.collection('sessions').findOne({token: token})
    
            if(!session) {
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
            }
    
            if (session.discord_session) {
                const user = await db.collection('discord_users').findOne({discord_id: session.discord_id})
                
                const allowedGuilds = user.allowed_guilds

                let commandAllowed = false;

                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId && (guild.administrator || guild.owner)) {
                        commandAllowed = true

                        break
                    }
                }

                if(!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized"
                    })

                    return
                }
            }

            let guildSubs = await db.collection('guilds').findOne(
                {
                    guild_id: reqGuildId
                }
            )
            .then(guild => guild?.subscriptions)

            if (!guildSubs) {
                guildSubs = []
            }

            res.send({
                status:"success",
                result: guildSubs
            })

        } catch (error) {
            console.log("Error while trying to get guild subscriptions: ", error)
            res.status(401).send({
                status: "failed",
                
            })
        }
    }) 

    app.post('/botdizguild/subscriptions/:guildId', async (req, res) => {
        
        try {
            const reqGuildId = req.params.guildId
    
            if(!reqGuildId) {
                console.log("No guild Id specified")
                res.status(401).send({
                    status: "failed",
                    message: "404 No guild id"
                })
                return
            }
    
            const token = req.session.token
    
            if(!token) {
                console.log("No token info in session (in /guildinfo)")
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
    
                return
            }
    
            const session = await db.collection('sessions').findOne({token: token})
    
            if(!session) {
                res.status(401).send({
                    status: "failed",
                    message: "401 Unauthorized"
                })
            }
    
            if (session.discord_session) {
                const user = await db.collection('discord_users').findOne({discord_id: session.discord_id})
                
                const allowedGuilds = user.allowed_guilds
    
                let commandAllowed = false;
    
                for (const guild of allowedGuilds) {
                    if (guild.id === reqGuildId && (guild.administrator || guild.owner)) {
                        commandAllowed = true
    
                        break
                    }
                }
    
                if(!commandAllowed) {
                    res.status(401).send({
                        status: "failed",
                        message: "401 Unauthorized"
                    })
    
                    return
                }
            }

            let dbSubs = await db.collection('guilds').findOne({ guild_id: reqGuildId })
            .then(guild => guild?.subscriptions)

            if (!dbSubs) {
                dbSubs = []
            }
            const reqSubType = req.body.type
            let subFound = false
            for (const sub of dbSubs) {
                if (sub.type === reqSubType) {
                    const guild = await Botdiz.GuildControllers.find(element => element.guildId === reqGuildId).guildObj
                    
                    let subbedChannel
                    if (guild){
                        subbedChannel = await guild.channels.fetch(req.body.subscribed_channel)
                    } 

                    if (subbedChannel) {
                        const { MessageEmbed } = require('discord.js')
    
                        let embedMessage = new MessageEmbed
    
                        if (!sub.active && req.body.active ||
                            (req.body.active && (sub.subscribed_channel !== req.body.subscribed_channel))) {
                            embedMessage
                                .setColor("#0FF28F")
                                .setTitle("This channel is now subscribed to epic deals")
                                .setTimestamp()
                            subbedChannel.send( {embeds: [embedMessage]} )
                        }
                    }

                    subFound = true
                    sub.subscribed_channel = req.body.subscribed_channel
                    sub.active = req.body.active

                }
            }

            if (!subFound) {
                dbSubs.push(req.body)
            }

            db.collection('guilds').updateOne(
                {
                    guild_id: reqGuildId
                },
                {
                    $set: {
                        subscriptions: dbSubs
                    }
                },
                {
                    upsert:true
                }
            )
            
        } catch (error) {
            console.log("Error while trying to update guild subs: ", error)
        }
    })
}