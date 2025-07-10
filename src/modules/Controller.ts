import {
    Guild,
    Client as DiscordClient,
    User,
    Message,
    CommandInteraction,
    ButtonInteraction,
    Interaction,
    ColorResolvable,
} from "discord.js";
import { Command } from "./Command";
import { ShoukakuHandler } from "../Shokaku/ShokakuHandler";
import { MsgHandler } from "./MessageHandler";
import { botCommands } from "../botCommands";
import { logger } from "../logger";
import { EmbedBuilder } from "discord.js";
import { MusicController } from "./MusicPlayer/MusicControllerLavalink";
import { SubscriptionManager } from "./SubscriptionManager";
import { Db } from "mongodb";
import { DbGuildObject } from "../../server_src/db/databaseTypes";

export class Controller {
    public PREFIX: string;
    public debugMode: boolean;
    public guild: Guild;
    public MusicController: MusicController | null;
    public client: DiscordClient;
    public commands: Command[];
    public oddiz: User | null;
    public roleColor: ColorResolvable;
    public db: Db | null;
    public SubscriptionManager: SubscriptionManager;

    constructor(db: Db | null, client: DiscordClient, guild: Guild, shoukaku: ShoukakuHandler) {
        this.PREFIX = "/";
        this.debugMode = false;
        this.guild = guild;
        this.client = client;
        this.commands = botCommands(this);
        this.MusicController = new MusicController(this, shoukaku);
        this.SubscriptionManager = new SubscriptionManager(guild, db);
        this.db = db;
        this.oddiz = null;
        this.client.application?.fetch().then((app) => {
            this.oddiz = app.owner as User | null;
        });

        this.roleColor = guild.members.me?.roles?.color?.color || "#e9b463";
    }

    init = async () => {
        //last update date is 03/11/2022
        const forceUpdateTill = new Date("2022-11-05T00:00:00.000Z"); // 2 days after last update
        const today = new Date();

        //check if bot needs to deploy slash commands
        if (today < forceUpdateTill) {
            this.deploySlashCommands();
        } else {
            this.guild.commands.fetch().then((commands) => {
                if (commands.size !== this.commands.length) {
                    logger.log("info", "Deploying slash commands");
                    this.deploySlashCommands();
                }
            });
        }

        try {
            if (this.db) {
                let dbGuildObject = (await this.db
                    .collection("guilds")
                    .findOne({ guild_id: this.guild.id })) as DbGuildObject | null;
                if (!dbGuildObject) {
                    const everyoneRole = this.guild.roles.everyone.id;
                    dbGuildObject = {
                        guild_id: this.guild.id,
                        guild_name: this.guild.name,
                        owner_id: this.guild.ownerId,
                        dj_roles: [everyoneRole],
                    };
                }
                await this.updateGuildInfoOnDatabase();
                await this.applyGuildSettings(dbGuildObject);
                await this.SubscriptionManager.init(dbGuildObject);
            }
        } catch (error) {
            console.log("Error while trying to init controller on database related things: ", error);
        }

        this.controllerMaintainer();
        logger.log("info", "Controller initialized for guild: " + this.guild.name);
    };

    controllerMaintainer = async () => {
        let aloneInVoice = false;
        const tenMinutes = 1000 * 60 * 10;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await new Promise((resolve) => setTimeout(resolve, tenMinutes));

                const connectedVoiceChannelMembers = this.guild?.members.me?.voice.channel?.members;
                const members = [];
                if (!connectedVoiceChannelMembers) {
                    continue;
                }
                connectedVoiceChannelMembers.each((member) => {
                    members.push(member.user);
                });

                // if bot is the only member of the voice channel first let the maintainer know bot is alone so it will kill the voice connection next pass
                if (members.length === 1 && aloneInVoice && this.MusicController) {
                    this.MusicController.stop();
                    this.MusicController.disconnectFromVoiceChannel();
                    aloneInVoice = false;
                } else if (members.length === 1) {
                    aloneInVoice = true;
                } else {
                    aloneInVoice = false;
                }
            } catch (error) {
                //fail silently
                aloneInVoice = false;
            }
        }
    };

    updateGuildInfoOnDatabase = async () => {
        if (!this.db) return;
        await this.db.collection("guilds").updateOne(
            {
                guild_id: this.guild.id,
            },
            {
                $set: {
                    guild_name: this.guild.name,
                    owner_id: this.guild.ownerId,
                },
            },
            {
                upsert: true,
            }
        );
        return;
    };

    applyGuildSettings = async (dbGuildObject: DbGuildObject) => {
        const settings = dbGuildObject?.settings;
        //apply settings to music controller
        if (settings && this.MusicController) {
            this.MusicController.applySettings(settings);
        }
    };

    saveGuildSettings = async () => {
        try {
            if (!this.db) return;
            if (this.MusicController) {
                const settings = {
                    recommendSongs: this.MusicController.recommendSongs,
                    skipVotingEnabled: this.MusicController.skipVotingEnabled,
                    skipVotingPassPercentage: this.MusicController.skipVotingPassPercentage,
                };

                await this.db.collection("guilds").updateOne(
                    {
                        guild_id: this.guild.id,
                    },
                    {
                        $set: {
                            settings: settings,
                        },
                    },
                    {
                        upsert: true,
                    }
                );
            }
        } catch (error) {
            logger.log("error", "Error while trying to save guild settings: " + error);
        }
    };
    deploySlashCommands() {
        try {
            const slashCommands = [];

            for (const command of this.commands) {
                slashCommands.push(command.convertSlashCommand());
            }

            this.guild.commands.set(slashCommands).catch((error) => {
                logger.log("error", "Error while trying to deploy slash commands: " + error);
            });
        } catch (error) {
            logger.log("error", "Error while trying to deploy slash commands: " + error);
        }
    }

    destroy() {
        this.MusicController?.stop();
        this.MusicController = null;
    }

    handleMessage(message: Message) {
        if (message.author.bot || !message.content.startsWith(this.PREFIX)) return;

        const msgObj = new MsgHandler(message, this.PREFIX);
        const responseObj = msgObj.run();

        /*
        {
            command: this.command,
            args: this.args
        } 
        */
        const newEmbed = new EmbedBuilder();
        newEmbed

            .addFields(
                { name: "\u200B", value: `Discord didn't register your message as a command!` },
                { name: "\u200B", value: `Make sure to press tab or enter after you typed /${responseObj.command}!` }
            )
            .setColor("#e9b463");

        message.channel.send({ embeds: [newEmbed] });

        return;
        /*
        if (this.debugMode) {
            const response = `Command: ${responseObj.command}, Args: ${responseObj.args}`
            message.channel.send(response)
        }

        const foundCommand = this.commands.find( ( { name } ) => name === responseObj.command )
        if (foundCommand) {
            if (this.debugMode){
                logger.log("info", `Command found ${foundCommand.name}`)
                message.channel.send("Command found:\n" + foundCommand.name)
            }
            foundCommand.execute(message, responseObj.args)
        }
        */
    }

    async handleButtonInteraction(interaction: ButtonInteraction) {
        if (!interaction.deferred) {
            interaction.deferReply();
            if (!interaction.replied) {
                interaction.reply({ content: interaction.customId + " clicked" });
            } else {
                interaction.editReply({ content: interaction.customId + " clicked" });
            }
        }
    }
    async handleInteraction(interaction: Interaction) {
        if (interaction.user.bot) return;

        if (interaction.isButton()) {
            this.handleButtonInteraction(interaction);
        } else if (interaction.isCommand()) {
            const commandName = interaction.commandName;
            const musicPlayerCommands = [
                "play",
                "skip",
                "pause",
                "playnext",
                "queue",
                "resume",
                "skip",
                "status",
                "stop",
                "votetoskip",
            ];

            if (musicPlayerCommands.includes(commandName) && this.MusicController) {
                this.MusicController.lastInvokedChannel = interaction.channel;
            }

            const foundCommand = this.commands.find(({ name }) => name === commandName);
            if (foundCommand) {
                if (this.debugMode) {
                    logger.log("info", `Command found ${foundCommand.name}`);
                    //message.channel.send("Command found:\n" + foundCommand.name)
                }
                foundCommand.execute(interaction, true);
            }
        } else {
            logger.log("warn", "Unknown interaction type: " + interaction.type);
        }
    }

    toggleDebug(options: "on" | "off") {
        if (options === "on") {
            this.debugMode = true;
        } else if (options === "off") {
            this.debugMode = false;
        } else {
            const curDebug = this.debugMode;
            this.debugMode = !curDebug;
        }

        return this.debugMode;
    }
}
