module.exports = async function (invokedMessage) {

    const axios = require('axios')
    const epicApiUrl = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=tr-TR&country=TR&allowCountries=TR"

    

    axios.get(epicApiUrl, { 
        headers:{
            "content-type": "application/json; charset=utf-8"
        }
    }).then(result => {
        
        if (result.status !== 200) {
            this.reply("Can't reach Epic servers at the moment please try again in a moment.")

            logger.log("error", "Couldn't reach epic API status code: "+ result.status)
            return
        }
        
        const Discord = require('discord.js')
        let activeDeals = []
        let futureDeals = []
        for (element of result.data.data.Catalog.searchStore.elements){
            const effectiveDate = Date.parse(element.effectiveDate)
            const date = new Date()
            const currentDate = date.getTime()
            
            const dateDiff = effectiveDate - currentDate;

            
            if (dateDiff < 0 || (element.promotions && element.promotions.promotionalOffers.length > 0)) {
                //promotion active
                //console.log("Promotion active for: ", element.title)
                
                
                
                let embedMessage = new Discord.MessageEmbed()
                embedMessage
                    .setColor("#0FF28F")
                    .setTitle(element.title)
                    .setThumbnail(element.keyImages[2].url)
                    .setTimestamp()
                    .setDescription("Free now on Epic Store!")


                activeDeals.push(embedMessage)
            } else {
                if (dateDiff > 1000 * 60 * 60 * 24 * 60) {
                    //hacky solution- if future deal is more than 60 days
                    continue
                }
                //promotion not active
                const seconds = Math.floor((dateDiff / (1000) % 60))
                const minutes = Math.floor((dateDiff / (1000 * 60) % 60))
                const hours = Math.floor((dateDiff / (1000 * 60 * 60 )) % 24)
                const days = Math.floor(dateDiff / (1000 * 60 * 60 * 24))
                //console.log("Days: ", days , "hours: ", hours, "minutes:", minutes, "seconds: ", seconds)

                let embedMessage = new Discord.MessageEmbed()
                embedMessage = embedMessage
                    .setColor("#CB462C")
                    .setTitle(element.title)
                    .setThumbnail(element.keyImages[1].url)
                    .setTimestamp()
                    .setDescription(`Will be free in: **${days} Days** **${hours} Hours** **${minutes} Minutes** **${seconds} Seconds**`)

                futureDeals.push(embedMessage)
            }  
            
        }
        
        this.reply( {embeds: [...activeDeals, ...futureDeals]})
        
    }).catch(err => {
        
        console.log("Error while reaching epic API" + err)
    })

}