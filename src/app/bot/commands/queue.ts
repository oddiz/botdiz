import { CommandInteraction } from 'discord.js';
import { createLogger } from '../shared/logging/Logger';
import { Command } from '../modules/Command';

const logger = createLogger('QueueCommand');

export default async function (this: Command) {
    const self = this;

    try {
        const musicController = self.controller.MusicController;

        if (!musicController) {
            self.reply('Bot is currently not playing.');
            return;
        }

        if (!musicController.isConnected()) {
            self.reply('Bot is not connected to a voice channel.');
            return;
        }

        const queue = musicController.getQueue();
        const current = musicController.getCurrentTrack();

        if (queue.length === 0 && !current) {
            self.reply('No songs in queue.');
            return;
        }

        let response = '**Current queue:**\n```apache\n';

        if (current) {
            const position = musicController.getPosition();
            const duration = current.info.duration;
            const positionStr = formatTime(position);
            const durationStr = formatTime(duration);
            
            response += `🎵 Playing: ${current.info.title}\n`;
            response += `   Progress: ${positionStr} / ${durationStr}\n\n`;
        }

        if (queue.length > 0) {
            response += 'Up next:\n';
            let counter = 1;
            
            // Show first 10 tracks to avoid hitting Discord's message limit
            const displayQueue = queue.slice(0, 10);
            
            for (const track of displayQueue) {
                const line = `${counter}. ${track.info.title}\n   by ${track.info.artist || 'Unknown'}\n`;
                
                // Check if adding this line would exceed Discord's limit
                if ((response + line).length > 1900) {
                    response += `... and ${queue.length - counter + 1} more tracks\n`;
                    break;
                }
                
                response += line;
                counter++;
            }
            
            if (queue.length > 10) {
                response += `\n... and ${queue.length - 10} more tracks\n`;
            }
        }

        response += '```';

        // Add queue statistics
        const totalTracks = queue.length + (current ? 1 : 0);
        const queueStats = `\n📊 **Queue Stats:** ${totalTracks} track${totalTracks !== 1 ? 's' : ''} total`;
        
        response += queueStats;

        self.reply(response);
        
    } catch (error) {
        logger.error('Error while executing queue command', error as Error);
        self.reply('❌ Failed to get queue information.');
    }
};

function formatTime(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}
