import { Command } from "../modules/Command";
import { GuildController } from "../core/GuildController";
import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { createLogger } from "../shared/logging/Logger";
import { MusicPlayerError, ValidationError } from "../shared/errors/BotdizError";
import { AddToQueueOptions } from "../domains/music/models/Track";

export type PlayCommandOptions = {
    query?: string | null;
    forceNext?: boolean;
};
const logger = createLogger('PlayCommand');

export default async function (
    this: Command,
    invokedMessage?: ChatInputCommandInteraction | null,
    options?: PlayCommandOptions | null
): Promise<void> {
    const self = this;
    const optionsDefault = {
        query: options?.query || null,
        forceNext: options?.forceNext || false,
    };
    
    try {
        const controller = self.controller as GuildController;
        const musicController = controller.MusicController;
        
        if (!controller) {
            logger.error('Play command is not bound to a controller');
            return;
        }

        if (!musicController) {
            logger.error('Music controller not found on the controller');
            return;
        }

        let input: string;
        if (optionsDefault?.query) {
            input = optionsDefault.query;
            if (!input) {
                return;
            }
        } else if (invokedMessage) {
            const inputValue = invokedMessage.options.getString("input");
            if (!inputValue) {
                self.wrongUsage(invokedMessage, self.name, "");
                return;
            }
            input = inputValue;

            const member = invokedMessage.member;
            if (!(member instanceof GuildMember)) {
                return;
            }
            
            const memberVoiceChannel = member.voice?.channel;
            if (!memberVoiceChannel) {
                self.reply("You are not in a voice channel.");
                return;
            }

            const botVoiceChannel = invokedMessage?.guild?.members.me?.voice.channel;

            // Handle voice channel connection with new architecture
            if (!musicController.isConnected()) {
                logger.info('Bot is not in a voice channel, connecting now.');
                try {
                    await musicController.connect(memberVoiceChannel);
                } catch (error) {
                    logger.error('Could not join voice channel', error as Error);
                    self.reply("Failed to join voice channel.");
                    return;
                }
            } else if (botVoiceChannel && memberVoiceChannel.id !== botVoiceChannel.id) {
                if (musicController.isPlaying()) {
                    logger.info('Bot is already playing in another channel');
                    self.reply("Bot is already playing in another channel ❗");
                    return;
                } else {
                    logger.info('Bot is not playing. Switching to new channel.');
                    await musicController.disconnect();
                    await musicController.connect(memberVoiceChannel);
                }
            }
        } else {
            throw new Error("No arguments provided");
        }

        // Use the new MusicController architecture
        try {
            const addToQueueOptions: AddToQueueOptions = {
                position: optionsDefault.forceNext ? 'next' : 'end'
            };
            
            if (!musicController.isConnected()) {
                throw new MusicPlayerError('Bot is not connected to a voice channel');
            }

            // Use the new play method which handles resolution and queueing
            if (optionsDefault.forceNext) {
                // Add to front of queue
                const tracks = await musicController.addToQueue(
                    input, 
                    invokedMessage?.user!, 
                    addToQueueOptions
                );
                
                if (tracks.length === 1) {
                    self.reply(`\`${tracks[0].info.title} added to queue (next) 👍\``);
                } else if (tracks.length > 1) {
                    self.reply(`\`${tracks.length} tracks added to queue (next) 👍\``);
                }
            } else {
                // Normal play - add to queue and start playing if not already playing
                const tracks = await musicController.play(input, invokedMessage?.user!, addToQueueOptions);
                
                if (tracks.length === 1) {
                    if (musicController.isPlaying()) {
                        self.reply(`\`${tracks[0].info.title} added to queue 👍\``);
                    } else {
                        self.reply(`\`Now playing: ${tracks[0].info.title} 🎵\``);
                    }
                } else if (tracks.length > 1) {
                    self.reply(`\`${tracks.length} tracks added to queue 👍\``);
                }
            }
        } catch (error) {
            logger.error('Error while executing play command', error as Error);
            
            if (error instanceof MusicPlayerError || error instanceof ValidationError) {
                self.reply(`❌ ${error.message}`);
            } else {
                self.reply("`Error trying to process command. Please try again.`");
            }
        }
    } catch (error) {
        logger.error('Error while executing play command', error as Error);
        self.reply("`Error trying to process command. Please try again.`");
    }
}
