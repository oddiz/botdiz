module.exports = function (invokedMessage) {
    
    const epicApiUrl = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=tr-TR&country=TR&allowCountries=TR"

    axiom.get(epicApiUrl, { 
        headers:{
            "content-type": "application/json; charset=utf-8"
        }
    }).then(result => {
        console.log(result)
    })

}