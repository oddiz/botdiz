const hash = require('object-hash')
const axios = require('axios')

module.exports = async function updateEpicDeals(db) { 

    try {

        const dbDeals = await db.collection('subscription_content').findOne(
            {
                type: "epic_deals"
            }
        )

        if (dbDeals && dbDeals.next_update_time > new Date().getTime()) {
            return
        }
        const epicApiUrl = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions"
    
        const epicApiReply = await axios.get(epicApiUrl, { 
            headers:{
                "content-type": "application/json; charset=utf-8"
            }
        })

        if (epicApiReply.status !== 200) {

            logger.log("error", "Couldn't reach epic API status code: "+ result.status)
            return
        }

        let epicGames = []
        let nextUpdateTime = Infinity
        for (element of epicApiReply.data.data.Catalog.searchStore.elements){
            
            if(!element.promotions) {
                continue
            }
            
            const currentDate = new Date().getTime()
            const gameTitle = element.title
            const isActive =
                element.promotions?.promotionalOffers[0]?.promotionalOffers[0]?.discountSetting?.discountPercentage === 0 &&
                element.price?.totalPrice?.discountPrice === 0 

            const isUpcoming = 
                !isActive &&
                element.promotions?.upcomingPromotionalOffers[0]?.promotionalOffers[0]?.discountSetting?.discountPercentage === 0


            if (!(isActive || isUpcoming)) {
                //not a free deal skip to next item

                continue
            }


            const epicDealObject = {
                gameTitle: gameTitle,
                isActive: isActive,
                thumbnail: element.keyImages[2].url,
                 
            }
            
            if (isUpcoming) {
                
                const effectiveDate = Date.parse(element.promotions?.upcomingPromotionalOffers[0]?.promotionalOffers[0]?.startDate)
                const dateDiff = effectiveDate - currentDate
                if (dateDiff > 1000 * 60 * 60 * 24 * 60) {
                    continue
                } else {
                    epicDealObject.activateTime = effectiveDate
    
                    nextUpdateTime = Math.min(effectiveDate, nextUpdateTime)
                }

                epicGames.push(epicDealObject)
            } else if (isActive) {
                epicDealObject.endTime = Date.parse(element.promotions.promotionalOffers[0].promotionalOffers[0].endDate)

                const parsedEndTime = Date.parse(element.promotions.promotionalOffers[0].promotionalOffers[0])
                nextUpdateTime = Math.min(parsedEndTime, nextUpdateTime)

                epicGames.push(epicDealObject)
            }
            
        }

        const dealGamesHash = hash(epicGames, { unorderedArrays: true})

        if (nextUpdateTime === Infinity) {
            //if somehow left at Infinity it won't update!
            nextUpdateTime = 0
        }

        const epicDealsDatabaseObject = {
            type: "epic_deals",
            next_update_time: nextUpdateTime,
            current_content: epicGames,
            current_content_hash: dealGamesHash
        }

        db.collection('subscription_content').updateOne(
            {
            type: "epic_deals"
            },
            {
                $set: epicDealsDatabaseObject
            },
            {
                upsert: true
            }
        )

        return epicDealsDatabaseObject
    } catch (error) {
        console.log("Error updating epic deals: ", error)
    }


}