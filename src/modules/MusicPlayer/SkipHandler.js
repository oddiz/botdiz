const { MessageEmbed } = require("discord.js")

const replyInterraction =require('../../scripts/replyInterraction')

module.exports = class SkipHandler {
    constructor(MusicController) {

        this.MusicController = MusicController

        this.passPercentage = 0.5
    }

    async handleInterface(userId, skipAmount, options = {forceSkip: false}) {
        try {
            if (this.MusicController.skipVotingEnabled && !options.forceSkip) {
                if (this.SkipVote) {
                    const result =  await this.SkipVote.addVote(userId)
                    if (result.voteAdded) {
                        return {
                            status: "success",
                            message: "Vote Added"
                        }
                    } else {
                        
                        if(result.userInChannel) {
                            //vote was not added because user already voted
                            return {
                                status: "failed",
                                message: "You already voted"
                            }
                        } else {
                            //vote was not added because user was not in voice channel
                            return {
                                status: "failed",
                                message: "You are not in voice channel"
                            }
                        }
    
                    }
                } else {
                    this.startSkipVoteMessageless(userId, skipAmount)

                    return {
                        status:"success",
                        message: "Starting skip vote to skip " + skipAmount + " songs."
                    }
                }
            } else {
                this.MusicController.skip(skipAmount)
            }
        } catch (error) {
            console.log("Error while trying to handle interface exec command in skip handler: ", error)
        }
    }

    async handle(invokedMessage, skipAmount, options = {forceSkip: false}) {
        try {
            if (this.MusicController.skipVotingEnabled && !options.forceSkip) {
    
                if (this.SkipVote) {
                    // vote for current skip
                    const result = await this.SkipVote.addVote(invokedMessage.member.id)
    
                    if (result.voteAdded) {
                        replyInterraction(invokedMessage, {content: `\`Vote added!\``})
                    } else {
                        
                        if(result.userInChannel) {
                            //vote was not added because user already voted
                            replyInterraction(invokedMessage, {content: "`You have already voted!`"})
                        } else {
                            //vote was not added because user was not in voice channel
                            replyInterraction(invokedMessage, {content: "`You are not even in voice channel!`"})
                        }
    
                    }
    
                } else {
                    try {
                        replyInterraction(invokedMessage, {content: `Skip voting is enabled. Starting a vote!`}, {ephemeral: true})
                        
                    } catch (error) {
                        
                    }
                    //if skip voting is enabled start voting
                    this.startSkipVote(invokedMessage.member, skipAmount)
                }
    
            } else {

                replyInterraction(invokedMessage, {content: "Skipping..."})
    
                this.MusicController.skip(skipAmount)
            }
            
        } catch (error) {
            
            console.log("Error while trying to handle skip message: ", error)
        }


    }

    getSkipVoteData() {
        const result = {}
        if (this.SkipVote){
            result.voteActive = true
            result.skipVoteData = this.SkipVote.skipVoteData
            result.skipData = this.SkipVote.skipData
        } else {
            result.voteActive = false
        }

        return result
    }

    setPassPercentage(float) {
        try {
            if(0 <= float && float <= 1) {
                this.passPercentage = float
            } else {
                this.passPercentage = 0.5
            }

            return true
            
        } catch (error) {
            console.log("Error while trying to set pass percentage: ", error)
            return false
        }
    }
    startSkipVote(invokedMember, skipAmount) {

        try {
            this.SkipVote = new SkipVote(this, invokedMember, skipAmount)
            this.SkipVote.init()
            
            
        } catch (error) {
            console.log("Error while trying to start skip vote: ", error)    
        }

    }

    async startSkipVoteMessageless(userId, skipAmount) {
        try {
            const user = await this.MusicController.guild.members.fetch(userId)
            this.SkipVote = new SkipVote(this, user, skipAmount)
            this.SkipVote.init()
            
            
        } catch (error) {
            console.log("Error while trying to start messageless skip vote: ", error)    
        }
    }

    async getVoiceChannelMembers() {
        try {
            if(this.MusicController.activeVoiceChannel) {
                const voiceChannelMembers = await this.MusicController.activeVoiceChannel.members
                
                let members = []
    
                voiceChannelMembers.each((member) => {
                    if(!member.user.bot){
                        members.push(member.user)
                    }
                })
                
                return members
            } else {
                return null
            }
            
        } catch (error) {
            console.log("Error while trying to get voice channel members: ", error)
        }
    }

    

    endVote () {
        this.SkipVote = null
    }

}

class SkipVote {
    constructor(SkipHandler, invokedUser, skipAmount) {
        this.SkipHandler = SkipHandler
        this.invokedTextChannel = SkipHandler.MusicController.lastInvokedChannel || null
        this.invokedUser = invokedUser
        this.voteMessage
        this.skipData = {
            skipAmount: skipAmount,
            currentSong: this.SkipHandler.MusicController.getCurrentSong(),
            invokedUser: this.invokedUser
        }
        
        this.skipVoteData = {
            voiceChannelMembers: [], 
            votedUsers: [],
        }

        
    }

    async init() {
        this.skipVoteData.voiceChannelMembers = await this.SkipHandler.getVoiceChannelMembers()
        this.addVote(this.invokedUser.id)
    }


    async createEmbedMessage(options) {

        try {

            if(this.invokedTextChannel) {
                const totalVotes = this.skipVoteData.votedUsers.length
                const totalVcUsers = this.skipVoteData.voiceChannelMembers.length
                
                const skipAmountMessage = this.skipData.skipAmount > 1 ? `to ${this.skipData.skipAmount}. song` : `${this.skipData.currentSong.info.title}`
        
                
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

    

    async deleteEmbedMessage(message, waitTimeSec = 0) {

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

    async addVote(userId) {
        try {
            const userInChannel = await this.isInVoiceChannel(userId)
            let voteAdded = false
            //if member hasn't voted yet and user is in voice channel
            if(
                !this.skipVoteData.votedUsers.includes(userId) &&
                userInChannel
            ) 
            {
                this.skipVoteData.votedUsers.push(userId)
                voteAdded = true
            }
    
            this.processVotes()
    
            return {voteAdded: voteAdded, userInChannel: userInChannel}
            
        } catch (error) {
            console.log("Error while trying to add vote: ", error)
        }
    }

    async isInVoiceChannel(userId) {
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
        }
    }

    async processVotes() {
        try {
            this.skipVoteData.voiceChannelMembers = await this.SkipHandler.getVoiceChannelMembers()
    
            const neededVotes = (this.skipVoteData.voiceChannelMembers.length) * this.SkipHandler.passPercentage
    
            if(this.skipVoteData.votedUsers.length > neededVotes) {
                //vote is passed
                await this.sendFinalEmbedMessage()
                
                if(this.voteMessage) {
                    this.deleteEmbedMessage(this.voteMessage, 5)
                }
                this.finalizeVote({passed: true})
                
            } else {
                if(!this.voteMessage){
                    this.createEmbedMessage()
                } else {
                    this.createEmbedMessage({update: true})
                }
            }
            
        } catch (error) {
            console.log("Error while trying to process vote: ", error)
        }

    }

    finalizeVote (options) {
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