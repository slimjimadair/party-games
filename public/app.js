document.addEventListener('DOMContentLoaded', () => {
  // Buttons
  const startGameKMKY = document.querySelector('#start-kmky')
  const joinGameButton = document.querySelector('#join-game')

  // Input fields
  const inputRoomCode = document.getElementById('join-room-code')
  const inputPlayerName = document.getElementById('join-player-name')

  // Main content blocks
  const headRoundBlock = document.querySelector('#head-round')
  const headAvatarBlock = document.querySelector('#head-avatar')
  const headRoomBlock = document.querySelector('#head-room')
  const mainTitle = document.querySelector('#main-title')
  const subTitle = document.querySelector('#sub-title')
  const prompt = document.querySelector('#prompt')
  const splashScreen = document.querySelector('#splash')
  const gameScreen = document.querySelector('#game')
  
  // Game control screen blocks
  const controlJoinBlock = document.querySelector('#control-join')
  const controlJoinCode = document.querySelector('#control-join-code')
  const controlJoinList = document.querySelector('#control-join-list')
  const controlPromptBlock = document.querySelector('#control-prompt')
  const controlResultsBlock = document.querySelector('#control-results')
  const controlScoresBlock = document.querySelector('#control-scores')

  // Info Blocks
  const joinInfoBlock = document.querySelector('#join-info-block')
  const joinStartBlock = document.querySelector('#start-info-block')

  // Global Settings
  let pageType = ''
  let roomCode = ''
  let playerName = ''

  // Add button listeners
  startGameKMKY.addEventListener('click', playKMKY)
  joinGameButton.addEventListener('click', joinGame)  

  // Connect
  const socket = io();

  // Room Controller - Knowing Me, Knowing You
  function playKMKY() {
    // Try to create a game
    socket.emit('start-game', 'kmky')

    // Handle room creation
    socket.on('room-created', roomData => {
      if (roomData === null) {
        // Handle unable to create room
        if ( !joinStartBlock.classList.contains('alert') ) joinStartBlock.classList.add('alert')
        if ( joinStartBlock.classList.contains('success') ) joinStartBlock.classList.remove('success')
        joinStartBlock.innerHTML = 'Unable to create new room. Server may be busy. Try again soon.'
      } else {
        // Room created successfully - switch to join screen
        pageType = 'room'
        roomCode = roomData.code
        headRoomBlock.innerHTML = `<div class="text note">ROOM CODE</div><div class="text main">${roomData.code}</div>`
        mainTitle.innerHTML = 'KNOWING ME, KNOWING YOU'
        subTitle.innerHTML = 'How well do you know your friends?'
        if ( gameScreen.classList.contains('hide') ) gameScreen.classList.remove('hide')
        if ( !splashScreen.classList.contains('hide') ) splashScreen.classList.add('hide')
        if ( controlJoinBlock.classList.contains('hide') ) controlJoinBlock.classList.remove('hide')
        controlJoinCode.innerHTML = roomData.code
        // Update list of room members
        if ( controlJoinList.classList.contains('hide') ) controlJoinList.classList.remove('hide')
        controlJoinList.innerHTML = `<div class="block-title">WHO'S IN?</div>`
        roomData.players.forEach(
          player => {
            if (player.vip) { playerClass = ' vip' } else { playerClass = '' }
            controlJoinList.innerHTML += `<div class="holder"><div class="item all-skewed player">  <img src="/icons/${player.icon}.jpg" class="avatar">  <div class="name ${playerClass}">${player.name}</div></div></div>`
          }
        )
        controlJoinList.innerHTML += `<div class="block-info">Press READY TO PLAY when everyone has joined!</div>`
      }
    })

    socket.on('room-updated', rooms => {
      if ( pageType === 'room' && roomCode !== '' ) {
        // Update list of room members
        controlJoinList.innerHTML = `<div class="block-title">WHO'S IN?</div>`
        rooms.forEach( room => {
          if (room.code === roomCode) {
            room.players.forEach( player => {
                if (player.vip) { playerClass = ' vip' } else { playerClass = '' }
                controlJoinList.innerHTML += `<div class="holder"><div class="item all-skewed player">  <img src="/icons/${player.icon}.jpg" class="avatar">  <div class="name ${playerClass}">${player.name}</div></div></div>`
            })
            controlJoinList.innerHTML += `<div class="block-info">Press READY TO PLAY when everyone has joined!</div>`
          }
        })
      }
    })

  }

  // Player
  function joinGame() {
    roomCode = inputRoomCode.value.toUpperCase()
    playerName = inputPlayerName.value.toUpperCase()
    if ( roomCode !== '' && playerName !== '') {
      // Try to join in inputs complete
      socket.emit('join-game', { code: roomCode, name: playerName } )
    } else {
      // Show incomplete form message
      if ( !joinInfoBlock.classList.contains('alert') ) joinInfoBlock.classList.add('alert')
      if ( joinInfoBlock.classList.contains('success') ) joinInfoBlock.classList.remove('success')
      joinInfoBlock.innerHTML = 'Valid room code and player name must be entered.<br />Room code can be found on the main game screen.'
    }

    socket.on('player-info', playerInfo => {
      if ( playerInfo === null ) {
        // Show error if game not found
        if ( !joinInfoBlock.classList.contains('alert') ) joinInfoBlock.classList.add('alert')
        if ( joinInfoBlock.classList.contains('success') ) joinInfoBlock.classList.remove('success')
        joinInfoBlock.innerHTML = 'Invalid room code entered. Please check and try again.'
      } else {
        // Room joined successfully
        pageType = 'player'
        headRoomBlock.innerHTML = `<div class="text note">ROOM CODE</div><div class="text main">${roomCode}</div>`
        mainTitle.innerHTML = 'KNOWING ME, KNOWING YOU'
        subTitle.innerHTML = 'How well do you know your friends?'
        headAvatarBlock.innerHTML = `<img src="/icons/${playerInfo.icon}.jpg" alt="Goat" class="avatar-big">`
        if ( gameScreen.classList.contains('hide') ) gameScreen.classList.remove('hide')
        if ( !splashScreen.classList.contains('hide') ) splashScreen.classList.add('hide')
      }
    })

  }

})