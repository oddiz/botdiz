import { Message, TextChannel, VoiceState } from 'discord.js';
import WebSocket from 'ws';


export type ListenerConstructedFunction = VoiceListenerConstructedFunction | TextListenerConstructedFunction;

export type ListenerFunction = (
    websocket: WebSocket,
    guildId: string,
    channelId?: string
) => ListenerConstructedFunction;

type VoiceListenerConstructedFunction = (
    message:  VoiceState,
) => void;
type TextListenerConstructedFunction = (
    message:  Message,
) => void;


export const RPC_listenTextChannel = (
        websocket: WebSocket,
        guildId: string,
        channelId: string
): TextListenerConstructedFunction => {
    return function (message: Message) {
        const guildID = guildId;
        const channelID = channelId;

        const channel = message.channel as TextChannel;

        //console.log(id, guildId, channelId)
        if (guildID == channel.guild.id && channelID == channel.id) {
            const replyMessage = JSON.stringify({
                event: 'new_message',
                listenerId: guildID,
                message: {
                    type: message.type,
                        author: message.author.username,
                    content: message.content,
                },
            });

            websocket.send(replyMessage);
        }
    };
}
export const RPC_listenVoiceChannels = (
        websocket: WebSocket,
        guildId: string
): VoiceListenerConstructedFunction => {
    return function (message: VoiceState) {
        //console.log(id, guildId, channelId)

        if (guildId === message.guild?.id) {
            const replyMessage = JSON.stringify({
                event: 'voicechannel_update',
                listenerId: guildId,
                guildId: guildId,
            });

            websocket.send(replyMessage);
        }
    };
}
