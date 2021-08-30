const { MessageEmbed } = require("discord.js")

module.exports = class SkipHandler {
    constructor(MusicController) {

        this.MusicController = MusicController

        this.skipData = {
            skipAmount: 0,
            currentSong: {
                info: {
                    title: "",

                }
            }
        }
    }

    handle(invokedMessage, skipAmount, options = {forceSkip: false}) {

        if (this.MusicController.skipVotingEnabled || !options.forceSkip) {

            if (this.skipVoteActive) {
                // vote for current skip

            } else {
                this.skipData.skipAmount = skipAmount
                this.skipData.currentSong = this.MusicController.getCurrentSong()
                if (this.skipData.currentSong) {
                    this.startSkipVote(invokedMessage)
                } else {
                    invokedMessage.reply({content: "`Not playing any song`"})
                }
                    
            }

        } else {

            this.MusicController.skip(skipAmount)
        }

    }

    startSkipVote(invokedMessage) {

        this.SkipVote = new SkipVote(this)
        this.SkipVote.init(invokedMessage)
        
    }

    async getVoiceChannelMembers() {
        if(this.MusicController.activeVoiceChannel) {
            const members = await this.MusicController.activeVoiceChannel.members
            
            return members
        } else {
            return null
        }
    }

    finalizeVote (options) {

        if (options.passed) {
            this.MusicController.skip(this.skipAmount)
        }
    }

}

class SkipVote {
    constructor(SkipHandler, invokedMessage) {
        this.SkipHandler = SkipHandler
        this.invokedTextChannel = invokedMessage.channel
        this.invokedUser = invokedMessage.member
        this.voteMessage
        
        this.skipData = this.SkipHandler.skipData
        this.skipVoteData = {
            voiceChannelMembers: [], 
            votedUsers: [],
        }

        this.createEmbedMessage(this.invokedUser, skipAmount)
    }


    async createEmbedMessage(skipAmount, options) {
        
        const totalVotes = this.skipVoteData.votedUsers.length
        const totalVcUsers = this.skipVoteData.voiceChannelMembers.length
        
        const skipAmountMessage = skipAmount > 1 ? `${skipAmount} songs` : "this song"
        
        const embed = new MessageEmbed()
        embed
            .setTitle("Skip Vote In Progress")
            .addField(`Votes: ${Math.ceil(totalVotes)} / ${totalVcUsers}`, `<@${this.invokedUser.id}> wants to skip ${skipAmountMessage}, type /skip to vote`)

        if (options.update && this.voteMessage) {
            await this.voteMessage.editReply({embeds: [embed]})
            
        } else {
            await this.voteMessage = await this.invokedTextChannel.send({embeds: [embed]})
        }

        return
    }

    async sendFinalEmbedMessage() {
        const finalEmbed = new MessageEmbed()

        finalEmbed 
            .setTitle("Vote skip passed! ⏩")

        await this.voteMessage.editReply({embeds: [finalEmbed]})
        
        return
    }

    

    async deleteEmbedMessage(waitTimeSec = 0) {

        await new Promise(resolve => setTimeout(resolve, waitTimeSec * 1000));

        await this.voteMessage.delete()

        return
    }

    async addVote(user) {
        const userInChannel = await this.isInVoiceChannel(user)
        
        //if member hasn't voted yet and user is in voice channel
        if(
            !this.skipVotedData.votedMembers.includes(user.id) &&
            userInChannel
        ) 
        {
            this.skipVoteData.votedUsers.push(user.id)
        }

        this.processVotes()
    }

    async isInVoiceChannel(user) {
        const vsMembers = await this.SkipHandler.getVoiceChannelMembers()

        for(const member of vsMembers) {
            if (member.id === user.id) {
                console.log("User in voice channel")
                return true
            }
        }

        return false
    }

    async processVotes() {

        this.skipVoteData.voiceChannelMembers = await this.SkipHandler.getVoiceChannelMembers()

        const neededVotes = Math.ceil(this.skipVoteData.votedUsers.length / this.skipVoteData.voiceChannelMembers.length)

        if(this.skipVoteData.votedUsers >= neededVotes) {
            //vote is passed
            this.SkipHandler.finalizeVote({passed: true})
            this.sendFinalEmbedMessage()
            this.deleteEmbedMessage(5)
        } else {
            this.createEmbedMessage()
        }

    }


}