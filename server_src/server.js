const express = require("express");
const cors = require("cors")
const app = express();
const WebSocket = require('ws')


app.use(cors())

app.use('/login', (req, res) => {

    //console.log(req)

    res.send({
        token: "test123"
    });
});

app.use('/validate', (req, res) => {

    //console.log(req)

    let isValidated;
    //check db and if token checks out
    isValidated = true
    //else send 
    //isValidated = false
    res.send({
        isValidated: isValidated
    });
});

const wss = new WebSocket.Server( {
    noServer: true
})

const server = app.listen(8080, () => console.log("Api is running on port 8080"))

let websocketClients = []

server.on("upgrade", (request, socket, head) => {
    console.log("server.on upgrade triggered..")

    wss.handleUpgrade(request, socket, head, function(ws) {
        wss.emit('connection', ws, request);
    });
});

wss.on('connection', function (ws, request, client) {
    console.log(ws)
    sendRandomNumbers(ws)
    
    websocketClients.push(client)
    //console.log(`${client}, connected to web socket.`)
    ws.on('message', function message(msg){
        //console.log(`Recieved message ${msg} from user ${client}`)
    })
})

const sendRandomNumbers = function(ws) {
    
    setTimeout(() => {
        const randNum = Math.random() * 1000;
        ws.send(randNum);
        console.log(`Sending ${randNum}`);
        sendRandomNumbers(ws)
    }, 50)
}

