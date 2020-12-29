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

// Definitions
const allIcons = ['ban','ber','cac','cak','car','cat','chr','dck','dlp','fan','flw','fsh','gir','got','lck','mon','mtc','oct','ott','pen','phn','pin','puf','rbt','sgn','sho','spn','tor','tre','wrn']

// Handle a socket connection request from web client
const roomsList = []
const roomsData = []
const dummyPlayers = [
  {name: 'SLUMDOG', icon: 'cat', vip: true, active: true},
  {name: 'SLIMJIM', icon: 'rbt', vip: false, active: true},
  {name: 'CRABGUTS', icon: 'ott', vip: false, active: true}
]
io.on('connection', socket => {
  let playerName = '';

  // Handle controller starting a game
  socket.on('start-game', game => {

    let roomCode = makeNewID(4, roomsList)
    if (roomCode !== '') {
      // Only assign room to connection if code created
      roomsList.push(roomCode)
      roomData = { code: roomCode, iconsAvailable: shuffle(allIcons), players: [] }
      roomsData.push(roomData)
      console.log(`Starting game: ${roomCode}`)
      socket.emit('room-created', roomData)
    } else {
      // Tell connection if room not created (code not possible)
      socket.emit('room-created', null);
    }

  })

  // Handle player joining a game
  socket.on('join-game', gameInfo => {
    // Check if room exists and respond
    var playerInfo = null
    var isVIP = false
    roomsData.forEach(room => {
      if (room.code === gameInfo.code) {
        playerName = gameInfo.name
        isVIP = (room.players.length === 0)
        playerInfo = { name: gameInfo.name, icon: room.iconsAvailable.slice(0, 1), vip: isVIP, active: true }
        room.players.push(playerInfo)
        room.iconsAvailable = room.iconsAvailable.slice(1)
        socket.broadcast.emit('room-updated', roomsData)
      }
    })
    socket.emit('player-info', playerInfo)
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

function shuffle(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array
}