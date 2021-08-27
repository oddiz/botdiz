const { logger } = require('../logger')
module.exports = async function (invokedMessage) {

    try {
        const MusicController = this.controller.MusicController


        MusicController.autoplay = !MusicController.autoplay

        this.reply({ content: `\`Autoplay is now ${MusicController.autoplay ? "on":"off"}\``})
    } catch (error) {
        logger.log("error", "Error while executing autoplay command: " + error)
    }
}