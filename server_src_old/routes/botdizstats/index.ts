import { getToken } from '../../scripts/getToken';
import { GuildControllers } from '../../../src/main';
import { Express } from 'express';
import { Db } from 'mongodb';
import { withAuth } from '../middlewares';

export default async function botdizstats(app: Express, db: Db) {
    app.get('/botdizstats', withAuth, async (req, res) => {
        const totalGuilds = GuildControllers.length;

        let totalPlaying = 0;
        for (const guild of GuildControllers) {
            if (guild.controller.MusicController?.audioPlayerStatus === 'PLAYING') {
                totalPlaying++;
            }
        }

        res.send({
            status: 'success',
            result: {
                total_guilds: totalGuilds,
                total_playing: totalPlaying,
            },
        });
    });
}
