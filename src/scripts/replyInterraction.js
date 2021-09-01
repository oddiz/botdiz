
module.exports = async (invokedMessage, content, options = { followup: false, new:false, required: true }) => {
    try {
        function isEmpty(map) {
            return map && map.size === 0
        }

        if(!invokedMessage) {
            // no message to reply
            return
        }

        
        //check if invoked message is still there
        const lastInvokedChannel = await invokedMessage?.channel?.fetch(true)
        if(!lastInvokedChannel) {
            return
        }
        const foundMessage = await lastInvokedChannel.messages.fetch(invokedMessage)

        //if not there send normal message and return
        if(isEmpty(foundMessage)) {
            if(options.required) {
                return await lastInvokedChannel.send(content)
            }
            return
        }
        

        if(invokedMessage.isCommand()) {
            //if we have interaction

            if (foundMessage.deffered && !foundMessage.replied) {
                return invokedMessage.reply(content)
            }
            
            //if followup option is passed or found message is deffered but not replied yet
            if (options.followup) {
                return invokedMessage.followUp(content)
                
            } 
            
            if (options.new) {
                invokedMessage = await invokedMessage.channel.send(content)
                

                return invokedMessage
            }

            return await invokedMessage.editReply(content).catch(async err=> {
                console.log(err + " -> Can't edit Last Invoked Message")

                if(options.new && options.required) {
                    invokedMessage = await invokedMessage.channel.send(content)

                    return invokedMessage
                }
            })
        

        } else {
            //if normal command
            if (options.required) {
                invokedMessage = await invokedMessage.channel.send(content)

                return invokedMessage
            }
        }
        
    } catch (error) {
        console.log("Failed to reply to command: \n" + error)
    }
} 