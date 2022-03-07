import { CommandInteraction } from 'discord.js';
import play from './play';

export default (invokedMessage: CommandInteraction) => {

    try {
        const boundPlay = play.bind(this)

        boundPlay(invokedMessage, {forceNext: true})
    } catch (error) {
        
    }
}