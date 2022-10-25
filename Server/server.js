// Server Setup
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const randomColor = require('randomcolor');
const createBoard = require('./create-board');

// Create an express app
const app = express();

// Serve static files in designated client folder
app.use(express.static(`${__dirname}/../client`));

// Create http server and set up socketio
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
      clearTimeout(timeOut);
    }
 }

// Socketio connection event listener
io.on('connection', (sock) => {
    // Player joining logic
    const color = randomColor();
    sock.emit('board', getBoard());
    // Log welcome messages to chat window
    io.emit('message','A new player has joined');
    sock.emit('message', 'Welcome!');
    playerList.push(sock);
    console.log(''+playerList.length+' '+whosTurn);
    
    // Upon chat message submitted, log to chat window
    sock.on('message', (text) => io.emit('message', text));

    // Upon player making a move in game, turn based logic
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
    // Upon a player disconnecting, remove player from player list for turn system
    // Also log to chat window that someone disconnected
    sock.on('disconnect', function(){
        io.emit('message', 'A player has disconnected')
        playerList.splice(playerList.indexOf(sock), 1)
    });
});

// Event listener for error event
server.on('error', (err) => {
    console.error(err);
});

// Event listener on port 8080
server.listen(8080, () => {
    console.log('server is ready');
}
);