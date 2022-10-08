const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const randomColor = require('randomcolor');
const createBoard = require('./create-board');

const app = express();

app.use(express.static(`${__dirname}/../client`));

const server = http.createServer(app);
const io = socketio(server);
const {clear, getBoard, makeTurn} = createBoard(20);
let playerList = [];
let currentTurn = 1;
let whosTurn = 0;
let timeOut;
const maxWaiting = 30000;

function next_turn(){
    whosTurn = currentTurn++ % playerList.length;
    //playersList[whosTurn].emit('your_turn');
    triggerTimeout();
    console.log(whosTurn);
 }

 function triggerTimeout(){
   timeOut = setTimeout(()=>{
     next_turn();
   },maxWaiting);
 }

 function resetTimeOut(){
    if(typeof timeOut === 'object'){
      //console.log("timeout reset");
      clearTimeout(timeOut);
    }
 }

io.on('connection', (sock) => {
    const color = randomColor();
    sock.emit('board', getBoard());
    io.emit('message','A new player has joined');
    sock.emit('message', 'Welcome!');
    playerList.push(sock);
    console.log(''+playerList.length+' '+whosTurn);
    
    sock.on('message', (text) => io.emit('message', text));
    sock.on('turn', ({x,y}) => {
        if (playerList[whosTurn]==sock){
            const values = makeTurn(x,y,color);
            if (values[1]){
                io.emit('turn', {x,y,color});
            }   

            if (values[0]){
                sock.emit('message', 'You Won!');
                io.emit('message', 'New Round');
                clear();
                io.emit('board');
            }
            resetTimeOut();
            next_turn();
            playerList[whosTurn].emit('message', 'Your turn!');
        }
    });
    sock.on('disconnect', function(){
        io.emit('message', 'A player has disconnected')
        playerList.splice(playerList.indexOf(sock), 1)
    });
});

server.on('error', (err) => {
    console.error(err);
});

server.listen(8080, () => {
    console.log('server is ready');
}
);