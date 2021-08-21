let skip = require('./skip')
const { logger } = require('../logger')
module.exports = function(invokedMessage) {

    try {
        skip = skip.bind(this)
        skip(invokedMessage)
    } catch (error) {
        logger.log("error", "Error while executing next command :", error)
    }

} 