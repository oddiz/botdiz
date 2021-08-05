const Botdiz = require('../../../src/main')
const { AudioPlayerStatus } = require('@discordjs/voice')

module.exports = async function botdizstats(app,db) {

    app.get('/botdizstats', async (req, res) => {
        
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


        const totalGuilds = Botdiz.GuildControllers.length

        let totalPlaying = 0
        for (guild of Botdiz.GuildControllers){
            if (guild.controller.MusicController.audioPlayerStatus !== AudioPlayerStatus.Playing) {
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