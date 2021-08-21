const { logger } = require("../logger");

let play = require('./play')

module.exports = function (invokedMessage) {

    try {
        play = play.bind(this)

        play(invokedMessage, {forceNext: true})
    } catch (error) {
        
    }
}