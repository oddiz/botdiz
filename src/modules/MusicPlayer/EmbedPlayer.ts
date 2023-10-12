import { ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordAPIError, EmbedBuilder, Message } from "discord.js";
import { BotdizShoukakuTrack, MusicController } from "./MusicControllerLavalink";

import { logger } from "../../logger";

export class EmbedPlayer {
    public MusicController: MusicController;
    public messageToEdit: Message | null;
    public oldMessage: Message | null;
    public currentSong: BotdizShoukakuTrack | null;
    public quit: boolean;
    public loopCount: number;
    public looping: boolean;

    constructor(MusicController: MusicController) {
        (this.MusicController = MusicController), (this.messageToEdit = null);
        this.oldMessage = null;
        this.currentSong = null;

        this.quit = true;
        this.looping = false;
        this.loopCount = 1;
    }

    start() {
        this.quit = false;

        this.updateLoop();
    }

    stop() {
        this.quit = true;
    }

    getQuitState() {
        return this.quit;
    }

    async updateLoop() {
        const botdizLink =
            process.env.NODE_ENV === "development" ? "http://localhost:3000/app" : "https://botdiz.kaansarkaya.com/app";
        const botdizLinkButton = new ActionRowBuilder<ButtonBuilder>().addComponents([
            new ButtonBuilder().setLabel("Botdiz Interface").setStyle(ButtonStyle.Link).setURL(botdizLink),
        ]);

        if (!this.MusicController.audioPlayer) {
            logger.log("error", "No audio player available. Can't run embed loop.");
            return;
        }
        while (!this.getQuitState()) {
            this.currentSong = this.MusicController.getCurrentSong();

            if (!this.currentSong || this.MusicController.audioPlayerStatus === "STOPPED") {
                this.stop();
                continue;
            }

            if (!(this.messageToEdit && this.currentSong)) {
                await new Promise((resolve) => setTimeout(resolve, this.MusicController.UPDATE_INTERVAL));

                continue;
            }
            try {
                this.looping = true;
                let newEmbed = new EmbedBuilder();
                newEmbed = newEmbed
                    .setColor(this.MusicController.controller.roleColor)
                    .addFields({ name: "Now Playing: ", value: `${this.currentSong.info.title}` })
                    .setTimestamp();
                if (this.currentSong.thumbnail) {
                    newEmbed = newEmbed.setThumbnail(this.currentSong.thumbnail);
                }

                const streamtime = this.MusicController.audioPlayer.position || 0;
                const streamHours = Math.floor((streamtime / (1000 * 60 * 60)) % 60);
                const streamMins = Math.floor((streamtime / (1000 * 60)) % 60);
                const streamSecs = Math.floor((streamtime / 1000) % 60);

                const videoLength = (this.currentSong.info.length || 0) / 1000; //seconds

                const videoHours = Math.floor((videoLength / (60 * 60)) % 60);
                const videoMins = Math.floor((videoLength / 60) % 60);
                const videoSecs = Math.floor(videoLength % 60);

                const videoLenMs = videoLength * 1000;

                const percentage = (streamtime * 100) / videoLenMs;

                const lines: string[] = new Array(30);
                lines[Math.floor(percentage / (100 / 30))] = "🟠";
                const progressBar = lines.join("-");
                let newEmbedMessage;

                if (this.currentSong.info.isStream) {
                    newEmbedMessage = newEmbed.addFields({
                        name: `Play time:`,
                        value: `${streamHours}:${streamMins.toString().padStart(2, "0")}:${streamSecs
                            .toString()
                            .padStart(2, "0")}\n\n Recommend Songs: ${
                            this.MusicController.recommendSongs ? "On" : "Off"
                        }`,
                    });
                } else if (videoHours > 0) {
                    newEmbedMessage = newEmbed.addFields(
                        {
                            name: "\u200B",
                            value: `${streamHours}:${streamMins.toString().padStart(2, "0")}:${streamSecs
                                .toString()
                                .padStart(2, "0")} / ${videoHours}:${videoMins.toString().padStart(2, "0")}:${videoSecs
                                .toString()
                                .padStart(2, "0")}`,
                        },
                        { name: "\u200B", value: `|${progressBar}|` },
                        {
                            name: `Recommend Songs:`,
                            value: `${this.MusicController.recommendSongs ? "On" : "Off"} `,
                        }
                    );
                } else {
                    newEmbedMessage = newEmbed.addFields(
                        {
                            name: "\u200B",
                            value: `${streamMins}:${streamSecs.toString().padStart(2, "0")} / ${videoMins}:${videoSecs
                                .toString()
                                .padStart(2, "0")}`,
                        },
                        { name: "\u200B", value: `|${progressBar}|` },

                        {
                            name: `Recommend Songs:`,
                            value: `${this.MusicController.recommendSongs ? "On" : "Off"}`,
                        }
                    );
                }

                await this.messageToEdit.edit({
                    embeds: [newEmbedMessage],
                    components: [botdizLinkButton],
                });

                this.loopCount++;
            } catch (error: DiscordAPIError | unknown) {
                if (error instanceof DiscordAPIError && error.code === 10008) {
                    //message to edit changed should be fixed next update
                } else {
                    logger.log("error", "Error in update loop.", error);
                }
            }
            await new Promise((resolve) => setTimeout(resolve, this.MusicController.UPDATE_INTERVAL));
        }

        if (this.getQuitState()) {
            try {
                if (this.currentSong) {
                    let newEmbed = new EmbedBuilder();
                    newEmbed = newEmbed
                        .setColor(this.MusicController.controller.roleColor)
                        .addFields(
                            { name: "\u200B", value: "Stopped playing:" },
                            {
                                name: "\u200B",
                                value: `${this.currentSong.info.title}`,
                            }
                        )
                        .setTimestamp();
                    if (this.currentSong.thumbnail) {
                        newEmbed = newEmbed.setThumbnail(this.currentSong.thumbnail);
                    }

                    if (this.messageToEdit) {
                        await this.messageToEdit.edit({
                            embeds: [newEmbed],
                            components: [botdizLinkButton],
                        });
                    }
                }
            } catch (error) {
                //silently fail shennanigans
                console.log("Error trying to post stopped playing message: " + error);
            }
        }
        this.looping = false;

        return;
    }

    /**
     * Change the message to be updated
     * @param {Message} message
     */
    async changeMessage(message: Message) {
        try {
            if (!message) {
                // no message to change
                return;
            }
            this.oldMessage = this.messageToEdit;
            try {
                if (this.oldMessage) {
                    //no message to delete so just return
                    await this.oldMessage.delete().catch((err) => {
                        console.log("Error while trying to delete message.");
                    });
                }
            } catch (err) {
                logger.log("error", "Error while trying to delete old embed message: ", err);
            }
            this.messageToEdit = message;
            this.quit = false;
        } catch (error) {
            console.log("Error while trying to change embed player message: ", error);
        }
    }

    /**
     * Change the song
     * @param {BotdizShoukakuTrack} song
     */
    changeSong(song: BotdizShoukakuTrack) {
        this.currentSong = song;
        this.quit = false;
    }
}
