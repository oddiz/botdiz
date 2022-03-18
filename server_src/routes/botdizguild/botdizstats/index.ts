import { getToken } from '../../../scripts/getToken'
import { GuildControllers } from '../../../../src/main'
import { Express } from 'express'
import { Db } from 'mongodb'

export default async function botdizstats(app: Express, db: Db) {

    app.get('/botdizstats', async (req, res) => {
        
        const token = getToken(req)

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


        const totalGuilds = GuildControllers.length

        let totalPlaying = 0
        for (const guild of GuildControllers){
            if (guild.controller.MusicController?.audioPlayerStatus === "PLAYING") {
                totalPlaying ++;
            }
        }
        
        res.send({
            status: "success",
            result: {
                total_guilds: totalGuilds,
                total_playing: totalPlaying
            }
        })
    })
}