let skip = require('./skip')

module.exports = function(invokedMessage) {

    skip = skip.bind(this)
    skip(invokedMessage, 1)
} 