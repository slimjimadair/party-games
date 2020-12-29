// Setup Server
const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Set static folder
app.use(express.static(path.join(__dirname, "public")))

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// Handle a socket connection request from web client
const roomsList = []
const roomsData = []
const dummyPlayers = [
  {name: 'SLUMDOG', icon: 'cat', vip: true},
  {name: 'SLIMJIM', icon: 'rbt', vip: false},
  {name: 'CRABGUTS', icon: 'ott', vip: false}
]
io.on('connection', socket => {

  // Handle controller starting a game
  socket.on('start-game', game => {

    let roomCode = makeNewID(4, roomsList)
    if (roomCode !== '') {
      // Only assign room to connection if code created
      roomsList.push(roomCode)
      roomData = { code: roomCode, players: dummyPlayers }
      roomsData.push(roomData)
      console.log(`Starting game: ${roomCode}`)
      socket.emit('room-info', roomData)
    } else {
      // Tell connection if room not created (code not possible)
      socket.emit('room-info', null);
    }
  })
})

// FUNCTIONS
function makeNewID(length, existingIDs) {
  var result = '';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charsLength = chars.length;
  var checkLimit = 0;
  do {
    result = ''
    for ( var i = 0; i < length; i++ ) {
      result += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    checkLimit += 1;
  }
  while ( (result === '' || existingIDs.includes(result)) && checkLimit < 1000 )
  if (existingIDs.includes(result)) {
    return ''
  } else return result
}