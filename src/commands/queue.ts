import { CommandInteraction } from 'discord.js';

import { logger } from 'src/logger';
import { Command } from 'src/modules/Command';

export default async () => {
    const self = this as unknown as Command;

    try {
        /**
         * If there is not Music Controller present or there are no songs in queue
         */

        if (!self.controller.MusicController) {
            self.reply('Bot is currently not playing.');

            return;
        }

        const queue = self.controller.MusicController.queue;
        const current = self.controller.MusicController.getCurrentSong();

        if (queue.length === 0 && !current) {
            self.reply('No songs in queue.');
            return;
        }

        let response = '**Current queue:**' + ' ```apache\n';

        if (current) {
            response = response + 'Playing: ' + current.info.title + '\n\n';
        }
        let counter = 1;
        for (const song of queue) {
            let line = '';
            line =
                counter +
                '- ' +
                song.info.title +
                (song.recommendedSong ? ' [Botdiz Recommended Song]' : '') +
                '\n\n';

            counter += 1;
            response = response + line;
        }

        if (response.length > 2000) {
            response = response.slice(0, 1996);
        }
        response = response + '```';

        self.reply(response);
    } catch (error) {
        logger.log('error', 'Error while executing queue command : ', error);

        self.reply('Queue is probably bugged atm. Contact my dad.');
    }
};
