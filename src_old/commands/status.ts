import { Command } from '../modules/Command';
import { createLogger } from '../shared/logging/Logger';
import { CommandInteraction, EmbedBuilder } from 'discord.js';

const logger = createLogger('StatusCommand');

export default async function (this: Command, invokedMessage?: CommandInteraction | null) {
    const self = this;
    
    try {
        const musicController = self.controller.MusicController;
        
        if (!musicController) {
            self.reply("Nothing is playing.");
            return;
        }

        if (!musicController.isConnected()) {
            self.reply("Bot is not connected to a voice channel.");
            return;
        }

        const currentTrack = musicController.getCurrentTrack();
        
        if (!currentTrack) {
            self.reply("Nothing is playing.");
            return;
        }

        // Get comprehensive status
        const status = musicController.getStatus();
        const position = musicController.getPosition();
        const volume = musicController.getVolume();
        const repeatMode = musicController.getRepeatMode();
        
        // Create status embed
        const embed = new EmbedBuilder()
            .setTitle('🎵 Now Playing')
            .setColor(self.controller.roleColor)
            .addFields([
                {
                    name: 'Track',
                    value: `**${currentTrack.info.title}**\nby ${currentTrack.info.artist || 'Unknown Artist'}`,
                    inline: false
                },
                {
                    name: 'Progress',
                    value: `${formatTime(position)} / ${formatTime(currentTrack.info.duration)}`,
                    inline: true
                },
                {
                    name: 'Volume',
                    value: `${volume}%`,
                    inline: true
                },
                {
                    name: 'Repeat Mode',
                    value: repeatMode === 'off' ? 'Off' : repeatMode === 'track' ? 'Track' : 'Queue',
                    inline: true
                },
                {
                    name: 'Status',
                    value: musicController.isPlaying() ? '▶️ Playing' : 
                           musicController.isPaused() ? '⏸️ Paused' : '⏹️ Stopped',
                    inline: true
                },
                {
                    name: 'Queue',
                    value: `${status.queue.length} track${status.queue.length !== 1 ? 's' : ''} remaining`,
                    inline: true
                },
                {
                    name: 'Requested by',
                    value: `<@${currentTrack.requestedBy.id}>`,
                    inline: true
                }
            ]);

        // Add thumbnail if available
        if (currentTrack.info.thumbnail) {
            embed.setThumbnail(currentTrack.info.thumbnail);
        }

        // Add track URL if available and not a stream
        if (currentTrack.info.url && !currentTrack.info.isStream) {
            embed.setURL(currentTrack.info.url);
        }

        self.reply({ embeds: [embed] });
        
    } catch (error) {
        logger.error('Error while executing status command', error as Error);
        self.reply("❌ Failed to get player status.");
    }
}

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