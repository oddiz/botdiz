import { CommandInteraction, GuildMember, Message, TextBasedChannel, User } from "discord.js";
import { BotdizShoukakuTrack, MusicController, SkipVoteEvent } from "./MusicControllerLavalink";
import { ExecCommandResponse } from "../../../server_src/Websocket/RPC_Commands/execCommands";
interface AddVoteStatus {
    voteAdded: boolean;
    userInChannel: boolean;
}
export interface SkipVoteData {
    voteActive: boolean;
    userData: SkipVoteUserData | null;
    skipData: SkipData | null;
}
export declare class SkipHandler {
    MusicController: MusicController;
    passPercentage: number;
    SkipVote: SkipVote | null;
    constructor(MusicController: MusicController);
    handleInterface(userId: string, skipAmount: number, options?: {
        forceSkip: boolean;
    }): Promise<ExecCommandResponse | undefined>;
    handle(invokedMessage: CommandInteraction, skipAmount: number, options?: {
        forceSkip: boolean;
    }): Promise<void>;
    getSkipVoteData(): SkipVoteData;
    getSkipVoteEvent(): SkipVoteEvent;
    triggerSkipVoteEvent(): void;
    setPassPercentage(float: number): boolean;
    startSkipVote(invokedMember: GuildMember, skipAmount: number): void;
    startSkipVoteMessageless(userId: string, skipAmount: number): Promise<void>;
    getVoiceChannelMembers(): Promise<User[]>;
    endVote(): void;
}
export interface SkipData {
    skipAmount: number;
    currentSong: BotdizShoukakuTrack | null;
    invokedUser: GuildMember;
}
type SkipVoteUserData = {
    voiceChannelMembers: User[];
    votedUsers: string[];
};
declare class SkipVote {
    skipData: SkipData;
    skipVoteUserData: SkipVoteUserData;
    SkipHandler: SkipHandler;
    invokedTextChannel: TextBasedChannel | null;
    invokedUser: GuildMember;
    voteMessage: Message | null;
    constructor(SkipHandler: SkipHandler, invokedUser: GuildMember, skipAmount: number);
    init(): Promise<void>;
    createEmbedMessage(): Promise<void>;
    sendFinalEmbedMessage(): Promise<void>;
    deleteEmbedMessage(message: Message, waitTimeSec?: number): Promise<void>;
    addVote(userId: string): Promise<AddVoteStatus | null>;
    isInVoiceChannel(userId: string): Promise<boolean>;
    processVotes(): Promise<void>;
    finalizeVote(options: {
        passed: boolean;
    }): void;
}
export {};
