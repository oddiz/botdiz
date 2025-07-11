import { Guild, Client as DiscordClient, CommandInteraction, ButtonInteraction } from "discord.js";
import { ShoukakuHandler } from "../Shokaku/ShokakuHandler";
import { MusicController } from "../domains/music/MusicController";
import { SubscriptionManager } from "../modules/SubscriptionManager";
import { GuildService, GuildSettings } from "../domains/guilds/GuildService";
import { CommandService } from "../domains/commands/CommandService";
import { botCommands } from "../botCommands";
import { createLogger } from "../shared/logging/Logger";
import { BotdizError } from "../shared/errors/BotdizError";
import { RepositoryManager } from "../infrastructure/database/RepositoryManager";

/**
 * Modern, focused GuildController that delegates responsibilities to specialized services
 */
export class GuildController {
    private readonly logger = createLogger('GuildController');
    private readonly guildService: GuildService;
    private readonly commandService: CommandService;
    private readonly musicController: MusicController;
    private readonly subscriptionManager: SubscriptionManager;
    private guildSettings: GuildSettings | null = null;
    private isInitialized = false;

    constructor(
        private readonly guild: Guild,
        private readonly client: DiscordClient,
        private readonly repositories: RepositoryManager,
        private readonly shoukaku: ShoukakuHandler
    ) {
        this.guildService = new GuildService(guild, client, repositories.guilds);
        this.commandService = new CommandService(guild);
        this.musicController = new MusicController(guild, shoukaku);
        this.subscriptionManager = new SubscriptionManager(guild, repositories.getDatabase());
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            this.logger.warn('Guild controller already initialized', { guildId: this.guild.id });
            return;
        }

        try {
            this.logger.info('Initializing guild controller', { 
                guildId: this.guild.id, 
                guildName: this.guild.name 
            });

            // Initialize guild settings
            this.guildSettings = await this.guildService.initializeGuild();

            // Register commands
            const commands = botCommands(this);
            this.commandService.registerCommands(commands);

            // Deploy slash commands if needed
            if (await this.commandService.shouldDeployCommands()) {
                await this.commandService.deploySlashCommands();
            }

            // Initialize subscription manager
            await this.subscriptionManager.init(this.guildSettings as any); // TODO: Fix typing

            this.isInitialized = true;
            this.logger.info('Guild controller initialized successfully', { guildId: this.guild.id });
        } catch (error) {
            this.logger.error('Failed to initialize guild controller', error as Error, { guildId: this.guild.id });
            throw error;
        }
    }

    async handleCommand(interaction: CommandInteraction, options?: any): Promise<void> {
        this.ensureInitialized();
        
        try {
            await this.commandService.executeCommand(interaction.commandName, interaction, options);
        } catch (error) {
            this.logger.error('Failed to handle command', error as Error, { 
                commandName: interaction.commandName,
                guildId: this.guild.id,
                userId: interaction.user.id 
            });

            if (error instanceof BotdizError) {
                await this.replyWithError(interaction, error.message);
            } else {
                await this.replyWithError(interaction, 'An unexpected error occurred');
            }
        }
    }

    async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        this.ensureInitialized();
        
        // Handle button interactions (voting, music controls, etc.)
        // This would delegate to appropriate services
        this.logger.debug('Handling button interaction', { 
            customId: interaction.customId,
            guildId: this.guild.id,
            userId: interaction.user.id 
        });
    }

    private async replyWithError(interaction: CommandInteraction, message: string): Promise<void> {
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: `❌ ${message}` });
            } else {
                await interaction.reply({ content: `❌ ${message}`, ephemeral: true });
            }
        } catch (error) {
            this.logger.error('Failed to reply with error', error as Error);
        }
    }

    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new Error('Guild controller not initialized');
        }
    }

    // Getters for backward compatibility and service access
    get PREFIX(): string {
        return this.guildSettings?.prefix || "/";
    }

    get commands() {
        return this.commandService.getAllCommands();
    }

    get MusicController(): MusicController {
        return this.musicController;
    }

    get SubscriptionManager(): SubscriptionManager {
        return this.subscriptionManager;
    }

    get roleColor() {
        return this.guildSettings?.roleColor || "#e9b463";
    }

    getGuild(): Guild {
        return this.guild;
    }

    getClient(): DiscordClient {
        return this.client;
    }

    getRepositories(): RepositoryManager {
        return this.repositories;
    }

    getGuildService(): GuildService {
        return this.guildService;
    }

    getCommandService(): CommandService {
        return this.commandService;
    }

    async destroy(): Promise<void> {
        this.logger.info('Destroying guild controller', { guildId: this.guild.id });
        
        // Clean up resources
        if (this.musicController) {
            // Add cleanup logic for music controller
        }
        
        if (this.subscriptionManager) {
            // Add cleanup logic for subscription manager
        }
        
        this.isInitialized = false;
    }
}