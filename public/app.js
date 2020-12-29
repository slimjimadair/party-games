document.addEventListener('DOMContentLoaded', () => {
  // Buttons
  const startGameKMKY = document.querySelector('#start-kmky')

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

  // Add button listeners
  startGameKMKY.addEventListener('click', playKMKY)

  // Room Controller - Knowing Me, Knowing You
  function playKMKY() {
    // Connect
    const socket = io();

    // Try to create a game
    socket.emit('start-game', 'kmky')

    // Handle room response
    socket.on('room-info', roomData => {
      if (roomData === null) {
        // Handle unable to create room
        if ( !joinStartBlock.classList.contains('alert') ) joinStartBlock.classList.add('alert')
        if ( joinStartBlock.classList.contains('success') ) joinStartBlock.classList.remove('success')
        joinStartBlock.innerHTML = 'Unable to create new room. Server may be busy. Try again soon.'
      } else {
        // Room created (or running) successfully - switch to join screen
        let pageType = 'room'
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
            controlJoinList.innerHTML += `<div class="holder"><div class="item all-skewed player">
                                                    <img src="/icons/${player.icon}.jpg" class="avatar">
                                                    <div class="name ${playerClass}">${player.name}</div></div></div>`
          }
        )
        controlJoinList.innerHTML += `<div class="block-info">Press READY TO PLAY when everyone has joined!</div>`
      }
    })
  }

})