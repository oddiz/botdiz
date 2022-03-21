import { Client, Message, Guild, VoiceState } from 'discord.js';
import { client as DiscordClient, GuildControllers } from '../../src/main';
import {
    RPC_listenTextChannel,
    RPC_listenVoiceChannels,
} from './RPC_Commands/listenerCommands';
import {
    AllowedGuild,
} from 'server_src/db/databaseTypes';
import { MusicController, MusicControllerEvents, MusicControllerEventsData } from '../modules/MusicPlayer/MusicControllerLavalink';
import WebSocket from 'ws';


export class ClientListenerManager {
    public client: Client;
    public websocket: WebSocket | null;
    public textListeners;
    public activeMusicListenerGuildId: string | null;
    public voiceChannelListeners;
    
    public listenMusicPlayer: boolean;

    constructor(websocket: WebSocket) {
        this.client = DiscordClient;
        this.websocket = websocket ;

        this.textListeners = new Map();
        this.voiceChannelListeners = new Map();

        this.activeMusicListenerGuildId = null;

        this.addVoiceChannelListener = this.addVoiceChannelListener.bind(this);
        this.addTextListener = this.addTextListener.bind(this);
        this.processTextMessage = this.processTextMessage.bind(this);
        this.processVoiceChannelUpdate =
            this.processVoiceChannelUpdate.bind(this);
        this.startMusicPlayerListener =
            this.startMusicPlayerListener.bind(this);

        this.client.on('messageCreate', this.processTextMessage);
        this.client.on('voiceStateUpdate', this.processVoiceChannelUpdate);

        this.listenMusicPlayer = false;
    }

    processTextMessage(message: Message) {
        try {
            for (const [id, listener] of this.textListeners) {
                listener(message);
            }
        } catch (error) {
            console.log('ERROR while trying to process text message: ', error);
        }
        //console.log("Listener list: " , this.listeners)
    }

    processVoiceChannelUpdate(state: VoiceState) {
        try {
            for (const [id, listener] of this.voiceChannelListeners) {
                listener(state);
            }
        } catch (error) {
            console.log(
                'ERROR while trying to process voice channel update: ',
                error
            );
        }
    }

    addTextListener(
        allowedGuilds: AllowedGuild[] | 'ALL',
        guildId: string,
        channelId: string

    ) {
        if(!this.websocket) return console.log ("websocket is null")
        if (allowedGuilds !== 'ALL') {
            let commandAllowed = false;
            //first param is always guild id
            const execGuildId = guildId;
            for (const allowedGuild of allowedGuilds) {
                if (execGuildId === allowedGuild.id) {
                    commandAllowed = true;
                }
            }

            if (!commandAllowed) {
                console.log('addTextListener command is not allowed for user');
                return;
            }
        }

        if (this.textListeners.has(guildId)) {
            console.log(
                'Text channel already has a listener, deleting existing one.'
            );
            this.textListeners.delete(guildId);
        }
        try {
            const constructedFunc = RPC_listenTextChannel(
                this.websocket,
                guildId,
                channelId
            );
            this.textListeners.set(guildId, constructedFunc);

            //console.log("Adding text listener new list: ", this.textListeners)
        } catch (error) {
            console.log(
                'Error while trying to add text channel listener: ',
                error
            );
        }
    }

    addVoiceChannelListener(
        allowedGuilds: AllowedGuild[] | 'ALL',
        guildId: string,
    ) {
        if(!this.websocket) return console.log ("websocket is null")

        if (allowedGuilds !== 'ALL') {
            let commandAllowed = false;
            //first param is always guild guildId
            const execGuildId = guildId;
            for (const allowedGuild of allowedGuilds) {
                if (execGuildId === allowedGuild.id) {
                    commandAllowed = true;
                }
            }

            if (!commandAllowed) {
                console.log(
                    'addVoiceChannelListener command is not allowed for user'
                );
                return;
            }
        }
        if (this.voiceChannelListeners.has(guildId)) {
            console.log('Voice channel already has a listener');

            return;
        }
        try {
            const constructedFunc = RPC_listenVoiceChannels(
                this.websocket,
                guildId
            );
            this.voiceChannelListeners.set(guildId, constructedFunc);

            //console.log("Adding voice channel listener new list: ", this.voiceChannelListeners)
        } catch (error) {
            console.log(
                'Error while trying to add voice channel listener: ',
                error
            );
        }
    }

    getMusicController(guildId: string) {
        try {
            const guildController = GuildControllers.find(
                (element) => element.guildId === guildId
            )?.controller;
    
            if (!guildController) {
                console.log('Guild not found?? ID: ', guildId);
                return;
            }
    
            const MusicController = guildController?.MusicController;
    
            if (!MusicController)
                throw new Error(
                    'MusicController not found in startMusicPlayerListener'
                );
    
            return MusicController
            
        } catch (error) {
            console.log('Error while trying to get music controller: ', error);

            return
        }


    }
    startMusicPlayerListener(
        allowedGuilds: AllowedGuild[] | 'ALL',
        guildId: string
    ) {
        try {
            //TODO: start 1 music player listener only and subscribe clients to it
            // Currently: runs the loop for every websocket listener
            if (allowedGuilds !== 'ALL') {
                let commandAllowed = false;
                //first param is always guild id
                for (const allowedGuild of allowedGuilds) {
                    if (guildId === allowedGuild.id) {
                        commandAllowed = true;
                    }
                }

                if (!commandAllowed) {
                    console.log(
                        'startMusicPlayerListener command is not allowed for user'
                    );
                    return;
                }
            }
            const self = this;
            
            const MusicController = this.getMusicController(guildId);

            if (!MusicController) return;
            
            if (this.websocket) {
                const musicControllerEvents: (keyof MusicControllerEvents)[] = ["queueUpdate", "skipVoteUpdate", "currentSongUpdate", "playerStatusUpdate", "playerUpdate"]

                for (const eventName of musicControllerEvents) {
                    MusicController.on(eventName, self.handleMusicPlayerEvents)
                }

                MusicController.triggerUpdate()

                this.activeMusicListenerGuildId = guildId;

            }
        } catch (error) {
            console.log(
                'Error while trying to start music player listener:',
                error
            );
        }
    }
    handleMusicPlayerEvents = (data: MusicControllerEventsData) => {

        
        if(this.websocket) {
            this.websocket.send(JSON.stringify(data));
        }
    }

    remove(id: string) {
        try {
            this.textListeners.delete(id);
        } catch (error) {
            console.log('Error while trying to delete listener id: ', id);
        }
    }

    clearListeners() {
        try {
            for (const [id, listener] of this.textListeners) {
                this.textListeners.delete(id);
            }
            for (const [id, listener] of this.voiceChannelListeners) {
                this.voiceChannelListeners.delete(id);
            }
            if(this.activeMusicListenerGuildId) {
                const MusicController = this.getMusicController(this.activeMusicListenerGuildId);
                if(MusicController) {
                    const musicControllerEvents: (keyof MusicControllerEvents)[] = ["queueUpdate", "skipVoteUpdate", "currentSongUpdate", "playerStatusUpdate", "playerUpdate"]
                    for (const eventName of musicControllerEvents) {
                        MusicController.off(eventName, this.handleMusicPlayerEvents)
                    }
                    this.activeMusicListenerGuildId = null;
                }
            }
            
        } catch (error) {
            console.log('Error while trying to clear listeners: ', error);
        }
        //console.log("Cleared listeners, listener list: ", this.listeners)
    }

    terminate() {
        try {
            this.clearListeners();
            this.client.removeListener('message', this.processTextMessage);
            this.client.removeListener(
                'voiceStateUpdate',
                this.processVoiceChannelUpdate
            );
            this.websocket = null;
        } catch (error) {
            console.log(
                'Error while trying to terminate listener manager: ',
                error
            );
        }
    }
};
