// Requirements
const fs = require('fs')

// SETUP SERVER
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

// DEFINITIONS
const allIcons = ['ban','ber','cac','cak','car','cat','chr','dck','dlp','fan','flw','fsh','gir','got','lck','mon','mtc','oct','ott','pen','phn','pin','puf','rbt','sgn','sho','spn','tor','tre','wrn']
let rawdata = fs.readFileSync('data/kmky.json')
const kmkyData = JSON.parse(rawdata)

// VARIABLES
const roomsList = []
const roomsData = []
const playsList = {}

// CONNECTION ACTIVITY
io.on('connection', socket => {
  // Connection data
  let connInfo = { type: '', room: '', name: '' }

  // Start game
  socket.on('start-room', gameType => {
    var roomCode = makeNewCode(4, roomsList)
    if (roomCode !== '') {
      // Only assign room to connection if code created
      roomsList.push(roomCode)
      playsList[roomCode] = []
      var roomInfo = { code: roomCode, game: gameType, state: 'join', icons: shuffle(allIcons), players: [], gameData: null }
      if (gameType === 'kmky') { roomInfo.gameData = shuffle(kmkyData) }
      roomsData.push(roomInfo)
      connInfo.type = 'room'
      connInfo.room = roomCode
      console.log(`Starting room: ${roomCode} [${gameType}]`)
      socket.emit('room-started', roomInfo)
    } else {
      // Tell connection if room not created (code not possible)
      socket.emit('room-started', null);
    }
  })

  // Join game
  socket.on('join-room', joinInfo => {
    // Check if room exists
    var emitInfo = null
    roomsData.forEach( room => {
      if (room.code === joinInfo.room && room.state === 'join' && !playsList[room.code].includes(joinInfo.name)) {
        // Add new player if in join mode
        playInfo = { name: joinInfo.name, state: 'join', icon: room.icons.pop(), vip: (room.players.length === 0), active: true, score: 0 }
        roomInfo = room
        emitInfo = { player: playInfo, room: roomInfo }
        room.players.push(playInfo)
        playsList[room.code].push(joinInfo.name)
        connInfo.type = 'play'
        connInfo.room = room.code
        connInfo.name = joinInfo.name
        console.log(`${connInfo.name} joining ${connInfo.room}`)
      } else if (room.code === joinInfo.room) {
        room.players.forEach( player => {
          if (player.name === joinInfo.name && !player.active) {
            player.active = true
            playInfo = player
            roomInfo = room
            emitInfo = { player: playInfo, room: roomInfo }
          }
        })
      }
    })
    socket.emit('room-joined', emitInfo)
    socket.broadcast.emit('room-updated', roomsData)
  })

  // Disconnect
  socket.on('disconnect', () => {
    if (connInfo.type === 'room') {
      // Handle room closing
      socket.broadcast.emit('room-closed', connInfo.room)
      var index = -1
      roomsData.forEach( room => {
        if (room.code === connInfo.room) {
          index = roomsData.indexOf(room)
        }
      })
      if (index > -1) roomsData.splice(index, 1)
    } else if (connInfo.type === 'play') {
      // Handle player drop
      roomsData.forEach( room => {
        if (room.code === connInfo.room) {
          room.players.forEach( player => {
            if (player.name === connInfo.name) player.active = false
          })
        }
      })
      socket.broadcast.emit('room-updated', roomsData)
    }
  })

  // Room ready
  socket.on('ready-room', roomCode => {
    socket.broadcast.emit('room-ready', roomCode)
  })

  // Room state
  socket.on('room-state', roomInfo => {
    roomsData.forEach( room => {
      if (room.code === roomInfo.code) room = roomInfo
      console.log(`Room ${room.code} set to ${room.state}`)
    })
  })

  // Questions
  socket.on('question-ask', questionInfo => {
    socket.broadcast.emit('question-ask', questionInfo)
  })
  socket.on('question-answer', answerInfo => {
    socket.broadcast.emit('question-answer', answerInfo)
  })

  // Choices
  socket.on('choice-ask', choiceInfo => {
    socket.broadcast.emit('choice-ask', choiceInfo)
  })
  socket.on('choice-answer', answerInfo => {
    socket.broadcast.emit('choice-answer', answerInfo)
  })

})

// FUNCTIONS
function makeNewCode(length, existingCodes) {
  var result = '';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charsLength = chars.length;
  var checkLimit = 0;
  do {
    code = ''
    for ( var i = 0; i < length; i++ ) {
      code += chars.charAt(Math.floor(Math.random() * charsLength));
    }
    checkLimit += 1;
  }
  while ( (code === '' || existingCodes.includes(code)) && checkLimit < 1000 )
  if (existingCodes.includes(code)) {
    return ''
  } else return code
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