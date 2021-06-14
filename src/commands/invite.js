module.exports = function(invokedMessage,) {
    //takes "on" or "off" as argument
    const inviteLink = "https://discord.com/oauth2/authorize?client_id=851497395190890518&scope=bot+applications.commands&permissions=3825192512"
    let newEmbed = new this.controller.discord.MessageEmbed()

    newEmbed = newEmbed
        .setColor("#e9b463")
        .setTitle("Invite Link")
        .setURL(inviteLink)
    
    invokedMessage.channel.send(newEmbed)
    
}


//https://discord.com/oauth2/authorize?client_id=851497395190890518&scope=bot+applications.commands&permissions=3825192512