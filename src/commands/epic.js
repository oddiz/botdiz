module.exports = function (invokedMessage) {
    
    const axios = require('axios')
    const epicApiUrl = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=tr-TR&country=TR&allowCountries=TR"

    axios.get(epicApiUrl, { 
        headers:{
            "content-type": "application/json; charset=utf-8"
        }
    }).then(result => {
        const Discord = this.controller.discord
        
        for (element of result.data.data.Catalog.searchStore.elements){
            const effectiveDate = Date.parse(element.effectiveDate)
            //console.log("Effective Date: " + effectiveDate, "from: ", element.effectiveDate)
            const date = new Date()
            const currentDate = date.getTime()
            
            const dateDiff = effectiveDate - currentDate;

            let activeDeals = []
            let futureDeals = []
            if (dateDiff < 0 || element.promotions.promotionalOffers.length > 0) {
                //promotion active
                //console.log("Promotion active for: ", element.title)
                
                
                
                let embedMessage = new Discord.MessageEmbed()
                embedMessage = embedMessage
                    .setColor("#0FF28F")
                    .setTitle(element.title)
                    .setThumbnail(element.keyImages[2].url)
                    .setTimestamp()
                    .setDescription("Free now on Epic Store!")

                activeDeals.push(embedMessage)
            } else {
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
            //current deals first
            async function sendCurrent() {
                let promises = []
                for (const embed of activeDeals){
                    
                    promises.push(invokedMessage.reply(embed))

                }
                Promise.all(promises).then((values) => {
                    //future deals later
                    for (const embed of futureDeals) {
                
                        invokedMessage.reply(embed)
                    }
                    
                })
            }

            sendCurrent()
            
        }
    })

}