class EmbedPlayer {
    constructor(MusicController, invokedMessage, botMessage){
        this.MusicController = MusicController;
        this.invokedMessage = invokedMessage;
        this.botMessage = botMessage
    }

    init() {
        currentTitle = ""
    }
}
/*
default implementation is bugged!

can't get current title in dispatch

make new module to handle updating embed player

*/