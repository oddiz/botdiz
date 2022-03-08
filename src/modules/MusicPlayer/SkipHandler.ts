import { CommandInteraction, GuildMember, Message, MessageEmbed, TextBasedChannel, User } from "discord.js"

import replyInterraction from '../../scripts/replyInterraction'
import { BotdizShoukakuTrack, MusicController } from "./MusicControllerLavalink"
import { ExecCommandResponse } from "../../../server_src/Websocket/RPC_Commands/execCommands";

interface AddVoteStatus {
    voteAdded: boolean;
    userInChannel: boolean;
}

interface SkipVoteData {
    voteActive: boolean;
    skipVoteUserData: SkipVoteUserData | null;
    skipData: SkipData | null;
}

export class SkipHandler {
    public MusicController: MusicController
    public passPercentage: number
    public SkipVote: SkipVote | null

    constructor(MusicController: MusicController) {
        this.MusicController = MusicController

        this.passPercentage = 0.5
        this.SkipVote = null
    }

    async handleInterface(
        userId: string,
        skipAmount: number,
        options = { forceSkip: false }
    ): Promise<ExecCommandResponse | undefined> {
        try {
            if (this.MusicController.skipVotingEnabled && !options.forceSkip) {
                if (this.SkipVote) {
                    const result = await this.SkipVote.addVote(userId)

                    if (!result) {
                        throw new Error('addVote result is null')
                    }
                    if (result.voteAdded) {
                        return {
                            status: 'success',
                            command: 'add_skip_vote',
                            message: 'Vote Added',
                        }
                    } else {
                        if (result.userInChannel) {
                            //vote was not added because user already voted
                            return {
                                status: 'failed',
                                command: 'add_skip_vote',
                                message: 'You already voted',
                            }
                        } else {
                            //vote was not added because user was not in voice channel
                            return {
                                status: 'failed',
                                command: 'add_skip_vote',
                                message: 'You are not in voice channel',
                            }
                        }
                    }
                } else {
                    this.startSkipVoteMessageless(userId, skipAmount)

                    return {
                        status: 'success',
                        command: 'add_skip_vote',
                        message:
                            'Starting skip vote to skip ' +
                            skipAmount +
                            ' songs.',
                    }
                }
            } else {
                this.MusicController.skip(skipAmount)

                return {
                    status: 'success',
                    command: 'add_skip_vote',
                    message: `Skipped ${skipAmount} songs.`,
                }
            }
        } catch (error) {
            console.log(
                'Error while trying to handle interface exec command in skip handler: ',
                error
            )

            return {
                status: 'failed',
                command: 'add_skip_vote',
                message: 'Unknown error occured',
            }
        }
    }

    async handle(
        invokedMessage: CommandInteraction,
        skipAmount: number,
        options = { forceSkip: false }
    ) {
        try {
            if (this.MusicController.skipVotingEnabled && !options.forceSkip) {
                const messageMember = invokedMessage.member as GuildMember;

                if (!messageMember) {
                    throw new Error("Message member is null")
                }   
                const messageMemberId = messageMember.id;
                if (!messageMemberId) {
                    throw new Error('Message member id is undefined')
                }
                
                if (this.SkipVote) {

                    // vote for current skip
                    const result = await this.SkipVote.addVote(
                        messageMemberId
                    )

                    if  (!result) {
                        throw new Error('addVote result is null')
                    }

                    if (result.voteAdded) {
                        replyInterraction(invokedMessage, {
                            content: `\`Vote added!\``,
                        })
                    } else {
                        if (result.userInChannel) {
                            //vote was not added because user already voted
                            replyInterraction(invokedMessage, {
                                content: '`You have already voted!`',
                            })
                        } else {
                            //vote was not added because user was not in voice channel
                            replyInterraction(invokedMessage, {
                                content: '`You are not even in voice channel!`',
                            })
                        }
                    }
                } else {
                    try {
                        if (!invokedMessage.member) {
                            throw new Error('Message member is undefined')
                        }
                        replyInterraction(
                            invokedMessage,
                            {
                                content: `Skip voting is enabled. Starting a vote!`,
                            },
                            { ephemeral: true }
                        )
                    } catch (error) {}
                    //if skip voting is enabled start voting
                    this.startSkipVote(messageMember, skipAmount)
                }
            } else {
                replyInterraction(invokedMessage, { content: 'Skipping...' })

                this.MusicController.skip(skipAmount)
            }
        } catch (error) {
            console.log('Error while trying to handle skip message: ', error)
        }
    }

    getSkipVoteData(): SkipVoteData {
        let voteActive = false;
        let skipVoteUserData = null;
        let skipData = null;

        if (this.SkipVote) {
            voteActive = true
            skipVoteUserData = this.SkipVote.skipVoteUserData
            skipData = this.SkipVote.skipData
        }

        const result = {
            voteActive: voteActive,
            skipVoteUserData: skipVoteUserData,
            skipData: skipData,
        }

        return result
    }

    setPassPercentage(float: number) {
        try {
            if (0 <= float && float <= 1) {
                this.passPercentage = float
            } else {
                this.passPercentage = 0.5
            }

            return true
        } catch (error) {
            console.log('Error while trying to set pass percentage: ', error)
            return false
        }
    }
    startSkipVote(invokedMember: GuildMember, skipAmount: number) {
        try {
            this.SkipVote = new SkipVote(this, invokedMember, skipAmount)
            this.SkipVote.init()
        } catch (error) {
            console.log('Error while trying to start skip vote: ', error)
        }
    }

    async startSkipVoteMessageless(userId: string, skipAmount: number) {
        try {
            const user = await this.MusicController.guild.members.fetch(userId)
            this.SkipVote = new SkipVote(this, user, skipAmount)
            this.SkipVote.init()
        } catch (error) {
            console.log(
                'Error while trying to start messageless skip vote: ',
                error
            )
        }
    }

    async getVoiceChannelMembers() {
        try {
            if (this.MusicController.activeVoiceChannel) {
                const voiceChannelMembers = await this.MusicController
                    .activeVoiceChannel.members

                let members: User[] = []

                voiceChannelMembers.each((member) => {
                    if (!member.user.bot) {
                        members.push(member.user)
                    }
                })

                return members
            } else {
                return []
            }
        } catch (error) {
            console.log(
                'Error while trying to get voice channel members: ',
                error
            )
            return []
        }
    }

    endVote() {
        this.SkipVote = null
    }
}

interface SkipData {
    skipAmount: number;
    currentSong: BotdizShoukakuTrack | null;
    invokedUser: GuildMember;
}

type SkipVoteUserData = {
    voiceChannelMembers: User[];
    votedUsers: string[];
}

class SkipVote {
    public skipData: SkipData;
    public skipVoteUserData: SkipVoteUserData;
    public SkipHandler: SkipHandler;
    public invokedTextChannel: TextBasedChannel | null;
    public invokedUser: GuildMember;
    public voteMessage: Message | null;

    constructor(SkipHandler: SkipHandler, invokedUser: GuildMember, skipAmount: number) {
        this.SkipHandler = SkipHandler;
        this.invokedTextChannel = SkipHandler.MusicController.lastInvokedChannel || null
        this.invokedUser = invokedUser;
        this.voteMessage = null;
        this.skipData = {
            skipAmount: skipAmount,
            currentSong: this.SkipHandler.MusicController.getCurrentSong(),
            invokedUser: this.invokedUser
        }
        
        this.skipVoteUserData = {
            voiceChannelMembers: [], 
            votedUsers: [],
        }

        
    }

    async init() {
        this.skipVoteUserData.voiceChannelMembers = await this.SkipHandler.getVoiceChannelMembers()
        this.addVote(this.invokedUser.id)
    }


    async createEmbedMessage() {

        try {

            if(this.invokedTextChannel) {
                const totalVotes = this.skipVoteUserData.votedUsers.length
                const totalVcUsers = this.skipVoteUserData.voiceChannelMembers.length
                
                

                const skipAmountMessage = this.skipData.skipAmount > 1 ? `to ${this.skipData.skipAmount}. song` : `${this.skipData.currentSong?.info.title || 'this song'}`
        
                
                const embed = new MessageEmbed()
                embed
                    .setTitle("Skip Vote In Progress")
                    .addField(`Votes: ${Math.ceil(totalVotes)} / ${totalVcUsers}`, `<@${this.invokedUser.id}> wants to skip ${skipAmountMessage}, type /skip to vote`)
        
                if (this.voteMessage) {
                    await this.voteMessage.edit({embeds: [embed]})
                    
                } else {
                    this.voteMessage = await this.invokedTextChannel.send({embeds: [embed]})
                }
        
                return
            }
            
        } catch (error) {
            console.log("Error while trying to create skip vote embed message: ", error)
        }
        
    }

    async sendFinalEmbedMessage() {
        try {
            if (this.invokedTextChannel) {
                const finalEmbed = new MessageEmbed()
        
                finalEmbed 
                    .setTitle("Vote skip passed! ⏩")
        
                if (!this.voteMessage) {
                    this.voteMessage = await this.invokedTextChannel.send({embeds: [finalEmbed]})
                } else {
                    this.voteMessage.edit({embeds: [finalEmbed]})
                    
                }
        
                
                return
            }
            
        } catch (error) {
            console.log("Error while trying to send final embed message :" , error)
        }
    }

    

    async deleteEmbedMessage(message: Message, waitTimeSec = 0) {

        try {
            await new Promise(resolve => setTimeout(resolve, waitTimeSec * 1000));

            if(!message.deleted) {
                await message.delete().catch((err)=> { console.log("Error while trying to delete message.")})
            }
    
            return
            
        } catch (error) {
            console.log("Error while trying to delete embed message: ", error)
        }

    }  

    async addVote(userId: string): Promise<AddVoteStatus | null > {
        try {
            const userInChannel = await this.isInVoiceChannel(userId)
            let voteAdded = false
            //if member hasn't voted yet and user is in voice channel
            if(
                !this.skipVoteUserData.votedUsers.includes(userId) &&
                userInChannel
            ) 
            {
                this.skipVoteUserData.votedUsers.push(userId)
                voteAdded = true
            }
    
            this.processVotes()
    
            return {
                voteAdded: voteAdded,
                userInChannel: userInChannel
            }
            
        } catch (error) {
            console.log("Error while trying to add vote: ", error)
            return null
        }
    }

    async isInVoiceChannel(userId: string) {
        try {
            const vsMembers = await this.SkipHandler.getVoiceChannelMembers()
    
            for(const member of vsMembers) {
                if (member.id === userId) {
                    return true
                }
            }
    
            return false
            
        } catch (error) {
            console.log("Error while trying to figure out if user is in voice channel: ", error)
            return false
        }
    }

    async processVotes() {
        try {
            this.skipVoteUserData.voiceChannelMembers = await this.SkipHandler.getVoiceChannelMembers()
    
            const neededVotes = (this.skipVoteUserData.voiceChannelMembers.length) * this.SkipHandler.passPercentage
    
            if(this.skipVoteUserData.votedUsers.length > neededVotes) {
                //vote is passed
                await this.sendFinalEmbedMessage()
                
                if(this.voteMessage) {
                    this.deleteEmbedMessage(this.voteMessage, 5)
                }
                this.finalizeVote({passed: true})
                
            } else {
                this.createEmbedMessage()
            }
            
        } catch (error) {
            console.log("Error while trying to process vote: ", error)
        }

    }

    finalizeVote(options: {passed: boolean}) {
        try {
            if (options.passed) {

                this.SkipHandler.MusicController.skip(this.skipData.skipAmount)
            }
    
            this.SkipHandler.endVote()
            
        } catch (error) {
            console.log("Error while trying to finalize vote: ", error)
        }
    }


}