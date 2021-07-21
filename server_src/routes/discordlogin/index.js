const fetch = require('node-fetch')
const crypto = require('crypto')
const uuid = require('uuid')

require('dotenv').config()
module.exports = async function playlists(app,db) {

    app.post("/discordlogin", async (req, res) => {

        const code = req.body?.code

        let clientId, clientSecret, redirectUri

        if (process.env.NODE_ENV === "development") {
            clientId = process.env.DISCORD_TESTBOT_CLIENT_ID
            clientSecret = process.env.DISCORD_TESTBOT_CLIENT_SECRET
            redirectUri = "http://localhost:3000/discordlogin"
        } else {
            clientId = process.env.DISCORD_CLIENT_ID
            clientSecret = process.env.DISCORD_CLIENT_SECRET
            redirectUri = "https://botdiz.kaansarkaya.com/discordlogin"
        }
        if (code) {
            try {
                const oauthResult = await fetch('https://discord.com/api/oauth2/token', {
                    method: "POST",
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code,
                        grant_type: 'authorization_code',
                        redirect_uri: redirectUri,
                    }),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                    
                })
                .then(response => response.json())

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
                    const error = oauthResult.error   
                    
                    res.status(401).send({
                        status: "error",
                        message: error.error_description
                    })

                    return
                }

                const accessToken = oauthResult.access_token
                const refreshToken = oauthResult.refresh_token
                const tokenType = oauthResult.token_type

                const userResult = await fetch('https://discord.com/api/users/@me', {
                    headers: {
                        authorization: `${tokenType} ${accessToken}`,
                    },
                })
                .then(response => response.json())
                
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
                
                const userGuilds = await fetch('https://discord.com/api/users/@me/guilds', {
                    headers: {
                        authorization: `${tokenType} ${accessToken}`,
                    },
                })
                .then(response => response.json())

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
                    0x8,    //ADMINISTRATOR
                    0x10,   //MANAGE_CHANNELS
                    0x20,   //MANAGE_GUILD
                ]
                console.log(userGuilds)
                let allowedGuilds = []
                
                for (const guild of userGuilds) {
                    //if user has administrator permissions to guild they can access 
                    if((guild.permissions & 0x8) === 0x8 ) {
                        allowedGuilds.push(guild)
                    }

                }

                const avatarURL = `https://cdn.discordapp.com/avatars/${userResult.id}/${userResult.avatar}`

                if (allowedGuilds.length > 0) {
                    db.collection('discord_users').updateOne(
                        {
                            "discord_id": userResult.id
                        },
                        { $set: {
                            "discord_id": userResult.id,
                            "username": userResult.username+"#"+userResult.discriminator,
                            "avatarURL": avatarURL,
                            "email": userResult.email,
                            "avatar": userResult.avatar,
                            "auth_token": accessToken,
                            "refresh_token": refreshToken,
                            "allowed_guilds": allowedGuilds 
                            }
                        },
                        { upsert: true }
                    )


                    const id = uuid.v4()
                    const token = await crypto.randomBytes(64).toString('hex')

                    db.collection('sessions').updateOne(
                        {
                            "discord_id": userResult.id
                        },
                        { $set: {
                            "createdAt": new Date(),
                            "discord_session": true,
                            "discord_id": userResult.id,
                            "user_id": id,
                            "username": userResult.username+"#"+userResult.discriminator,
                            "token": token
                            }
                        },
                        {
                            upsert: true
                        }
                    )
                    req.session.userId = id;
                    req.session.token = token
                    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7 //7 days
                    if (process.env.NODE_ENV == "development") {
                        res.header('Access-Control-Allow-Origin', 'http://localhost:3000')
                    } else {
                        res.header('Access-Control-Allow-Origin', 'https://botdiz.kaansarkaya.com')
                    }
                    res.header('Access-Control-Allow-Credentials','true')
                    //console.log(req)
                    
                    res.status(200).send({
                        result: "OK",
                        message: "Login successfull",
                    });

                    console.log(userResult.username+"#"+userResult.discriminator + " logged in.")
                }


            } catch (error) {
                console.log("Error while trying to get token from discord oauth",error)
            }
        }
    })


}