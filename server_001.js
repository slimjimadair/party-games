// Setup Server
const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// Requirements
const fs = require('fs')

// Set static folder
app.use(express.static(path.join(__dirname, "public")))

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// Definitions
const allIcons = ['ban','ber','cac','cak','car','cat','chr','dck','dlp','fan','flw','fsh','gir','got','lck','mon','mtc','oct','ott','pen','phn','pin','puf','rbt','sgn','sho','spn','tor','tre','wrn']
let rawdata = fs.readFileSync('data/kmky.json')
const kmkyData = JSON.parse(rawdata)

// Handle a socket connection request from web client
const roomsList = []
const roomsData = []
io.on('connection', socket => {
  let connType = '';
  let playerName = '';

  // Handle controller starting a game
  socket.on('start-game', game => {

    connType = 'control'

    let roomCode = makeNewID(4, roomsList)
    if (roomCode !== '') {
      // Only assign room to connection if code created
      roomsList.push(roomCode)
      roomData = { code: roomCode, playing: false, iconsAvailable: shuffle(allIcons), players: [] }
      if (game === 'kmky') { roomData.gameData = shuffle(kmkyData) }
      roomsData.push(roomData)
      console.log(`Starting game: ${roomCode}`)
      socket.emit('room-created', roomData)
    } else {
      // Tell connection if room not created (code not possible)
      socket.emit('room-created', null);
    }

  })

  // Let everyone know if game ready
  socket.on('room-ready', roomCode => {
    socket.broadcast.emit('room-ready', roomCode)
    console.log(`Players ready: ${roomCode}`)
  })

  // Issue prompts
  socket.on('set-prompts', promptInfo => {
    socket.broadcast.emit('set-prompts', promptInfo)
    console.log(`Sending prompts: ${promptInfo.room}`)
  })

  // Handle player joining a game
  socket.on('join-game', gameInfo => {
    // Check if room exists and respond
    var playerInfo = null
    var isVIP = false
    roomsData.forEach(room => {
      if (room.code === gameInfo.code) {
        if (room.playing === false) {
          playerName = gameInfo.name
          connType = 'player'
          isVIP = (room.players.length === 0)
          playerInfo = { name: gameInfo.name, icon: room.iconsAvailable.slice(0, 1), vip: isVIP, active: true }
          room.players.push(playerInfo)
          room.iconsAvailable = room.iconsAvailable.slice(1)
          socket.broadcast.emit('room-updated', roomsData)
        } else {
          for (player in room.players) {
            if (!player.active && player.name === gameInfo.name) {
              playerName = gameInfo.name
              connType = 'player'
              player.active = true
            }
          }
          socket.broadcast.emit('room-updated', roomsData)
        }
      }
    })
    socket.emit('player-info', playerInfo)
  })

  // Submit prompts
  socket.on('submit-prompt', promptSubmission => {
    socket.broadcast.emit('submit-prompt', promptSubmission)
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