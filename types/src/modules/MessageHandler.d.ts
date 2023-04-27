import { Message } from 'discord.js';
export declare class MsgHandler {
    private message;
    private message_content;
    private prefix;
    private command;
    private args;
    constructor(message: Message, prefix: string);
    /**
     * A function that parses the incoming message and extracts the command and arguments.
     *
     * Returns true if successful, false if not.
     *
     * @returns {boolean}
     */
    parseMessage(): boolean;
    run(): {
        command: string;
        args: string[];
    };
}
