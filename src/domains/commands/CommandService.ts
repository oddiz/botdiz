import { Guild, CommandInteraction, ApplicationCommandData } from "discord.js";
import { Command } from "../../modules/Command";
import { createLogger } from "../../shared/logging/Logger";
import { ValidationError } from "../../shared/errors/BotdizError";

export class CommandService {
    private readonly logger = createLogger('CommandService');
    private commands: Map<string, Command> = new Map();

    constructor(private readonly guild: Guild) {}

    registerCommand(command: Command): void {
        this.commands.set(command.name, command);
        this.logger.debug('Registered command', { 
            commandName: command.name, 
            guildId: this.guild.id 
        });
    }

    registerCommands(commands: Command[]): void {
        commands.forEach(command => this.registerCommand(command));
        this.logger.info('Registered commands', { 
            count: commands.length, 
            guildId: this.guild.id 
        });
    }

    async executeCommand(
        commandName: string, 
        interaction: CommandInteraction, 
        options?: any
    ): Promise<void> {
        const command = this.commands.get(commandName);
        
        if (!command) {
            this.logger.warn('Command not found', { 
                commandName, 
                guildId: this.guild.id,
                userId: interaction.user.id 
            });
            throw new ValidationError(`Command '${commandName}' not found`);
        }

        try {
            this.logger.debug('Executing command', { 
                commandName, 
                guildId: this.guild.id,
                userId: interaction.user.id 
            });
            
            await command.execute(interaction, true, options);
            
            this.logger.debug('Command executed successfully', { 
                commandName, 
                guildId: this.guild.id,
                userId: interaction.user.id 
            });
        } catch (error) {
            this.logger.error('Command execution failed', error as Error, { 
                commandName, 
                guildId: this.guild.id,
                userId: interaction.user.id 
            });
            throw error;
        }
    }

    getCommand(name: string): Command | undefined {
        return this.commands.get(name);
    }

    getAllCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    getSlashCommandData(): ApplicationCommandData[] {
        return this.getAllCommands().map(command => command.convertSlashCommand());
    }

    async deploySlashCommands(): Promise<void> {
        try {
            const commandData = this.getSlashCommandData();
            await this.guild.commands.set(commandData);
            
            this.logger.info('Deployed slash commands', { 
                count: commandData.length, 
                guildId: this.guild.id 
            });
        } catch (error) {
            this.logger.error('Failed to deploy slash commands', error as Error, { guildId: this.guild.id });
            throw error;
        }
    }

    async shouldDeployCommands(): Promise<boolean> {
        try {
            const existingCommands = await this.guild.commands.fetch();
            const localCommands = this.getAllCommands();
            
            // Force update if counts don't match
            if (existingCommands.size !== localCommands.length) {
                return true;
            }

            // You could add more sophisticated comparison logic here
            // For now, we'll use a simple timestamp-based approach
            const forceUpdateTill = new Date("2022-11-05T00:00:00.000Z");
            const today = new Date();
            
            return today < forceUpdateTill;
        } catch (error) {
            this.logger.error('Failed to check if commands should be deployed', error);
            return true; // Default to deploying on error
        }
    }
}