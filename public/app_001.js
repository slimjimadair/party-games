document.addEventListener('DOMContentLoaded', () => {
  // Buttons
  const startGameKMKY = document.querySelector('#start-kmky')
  const joinGameButton = document.querySelector('#join-game')
  const gameReadyButton = document.querySelector('#player-ready')

  // Input fields
  const inputRoomCode = document.querySelector('#join-room-code')
  const inputPlayerName = document.querySelector('#join-player-name')

  // Main content blocks
  const headRoundBlock = document.querySelector('#head-round')
  const headAvatarBlock = document.querySelector('#head-avatar')
  const headRoomBlock = document.querySelector('#head-room')
  const mainTitle = document.querySelector('#main-title')
  const subTitle = document.querySelector('#sub-title')
  const promptTitle = document.querySelector('#prompt')
  const splashScreen = document.querySelector('#splash')
  const gameScreen = document.querySelector('#game')
  
  // Game control screen blocks
  const controlJoinBlock = document.querySelector('#control-join')
  const controlJoinCode = document.querySelector('#control-join-code')
  const controlJoinList = document.querySelector('#control-join-list')
  const controlPromptBlock = document.querySelector('#control-prompt')
  const controlResultsBlock = document.querySelector('#control-results')
  const controlScoresBlock = document.querySelector('#control-scores')

  // Player screen blocks
  const playerJoinBlock = document.querySelector('#player-join')
  const playerJoinMsg = document.querySelector('#player-join-msg')
  const playerVIPMsg = document.querySelector('#player-vip-msg')
  const playerInputBlock = document.querySelector('#player-input')
  const playerWaitBlock = document.querySelector('#player-input')

  // Info Blocks
  const joinInfoBlock = document.querySelector('#join-info-block')
  const joinStartBlock = document.querySelector('#start-info-block')

  // Global Settings
  let pageType = ''
  let roomCode = ''
  let roomInfo = []
  let playerName = ''
  let totalRounds = 0
  let promptTrack = 0


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
            // Store room info
            roomInfo = room
            room.players.forEach( player => {
                if (player.vip) { playerClass = ' vip' } else { playerClass = '' }
                controlJoinList.innerHTML += `<div class="holder"><div class="item all-skewed player">  <img src="/icons/${player.icon}.jpg" class="avatar">  <div class="name ${playerClass}">${player.name}</div></div></div>`
            })
            controlJoinList.innerHTML += `<div class="block-info">Press READY TO PLAY when everyone has joined!</div>`
          }
        })
      }
    })

    socket.on('room-ready', room => {
      if (room === roomCode ) {
        // Plan rounds
        totalRounds = Math.floor(10 / roomInfo.players.length)
        var prompts = shuffle(roomInfo.gameData)
        var players = roomInfo.players
        for (player in players) { player.score = 0 }
        
        playRound(1, players, prompts)
      }

    })

    function playRound(roundID, players, prompts) {
      // Set up screen
      if ( !controlJoinBlock.classList.contains('hide') ) controlJoinBlock.classList.add('hide')
      if ( !controlJoinList.classList.contains('hide') ) controlJoinList.classList.add('hide')
      if ( controlPromptBlock.classList.contains('hide') ) controlPromptBlock.classList.remove('hide')
      headRoundBlock.innerHTML = `<div class="text main">ROUND: ${roundID}</div>`
      if ( !mainTitle.classList.contains('hide') ) mainTitle.classList.add('hide')
      if ( !subTitle.classList.contains('hide') ) subTitle.classList.add('hide')
      if ( promptTitle.classList.contains('hide') ) promptTitle.classList.remove('hide')
      promptTitle.innerHTML = 'ANSWER PROMPTS ON YOUR DEVICES NOW!'
      controlPromptBlock.innerHTML = `<div class="block-title light">BE HONEST!</div>`

      // Create prompts
      var roundData = []
      for ( var j = 0; j < players.length; j++ ) {
        promptItem = prompts[promptTrack]
        promptItem.prompt = promptItem.prompt.toUpperCase()
        promptItem.prompt = promptItem.prompt.replace("[PLAYER]", `<span class="highlight">${players[j].name}</span>`)
        var roundItem = { name: players[j].name, prompt: promptItem, truth: '', lies: [] }
        roundData.push(roundItem)
        promptTrack += 1
      }

      // Create initial truth prompts
      var truthPrompts = []
      roundData.forEach( item => {
        truthPrompts.push( { for: item.name, prompt: item.prompt.prompt, promptDetail: 'ANSWER TRUTHFULLY ABOUT YOURSELF!'} )
      })
      socket.emit('set-prompts', { room: roomCode, promptData: truthPrompts, action: 'wait' } )

      var readyCount = 0
      // Handle submissions
      socket.on('submit-prompt', promptSubmission => {
        if (promptSubmission.room === roomCode) {
          roundData.forEach(item => {
            if (item.name === promptSubmission.from) {
              item.truth = promptSubmission.submission
              players.forEach(player => {
                if (player.name === item.name) {
                  controlPromptBlock.innerHTML += `<div class="holder"><div class="item all-skewed player">  <img src="/icons/${player.icon}.jpg" class="avatar">  <div class="name ${playerClass}">${player.name}</div></div></div>`
                }
              })
              readyCount += 1
            }
          })
        }
        console.log(readyCount)
        if (readyCount === players.length) {
          // All submissions are in
          playPrompt(roundID, 1, players, roundData)
        }
      })

    }

    function playPrompt(roundID, playerID, players, roundData) {
      // Get lies from players
      var roundItem = roundData[playerID - 1]
      var liePrompts = []
      players.forEach( player => {
        if (player.name !== roundItem.name) {
          liePrompts.push( { for: player.name, prompt: roundItem.prompt.prompt, promptDetail: `MAKE UP A BELIEVABLE LIE ABOUT ${roundItem.name}`} )
        }
      })
      socket.emit('set-prompts', { room: roomCode, promptData: liePrompts, action: 'wait' } )

      // Set up screen
      if ( !controlJoinBlock.classList.contains('hide') ) controlJoinBlock.classList.add('hide')
      if ( !controlJoinList.classList.contains('hide') ) controlJoinList.classList.add('hide')
      if ( controlPromptBlock.classList.contains('hide') ) controlPromptBlock.classList.remove('hide')
      headRoundBlock.innerHTML = `<div class="text main">ROUND: ${roundID}</div>`
      if ( !mainTitle.classList.contains('hide') ) mainTitle.classList.add('hide')
      if ( !subTitle.classList.contains('hide') ) subTitle.classList.add('hide')
      if ( promptTitle.classList.contains('hide') ) promptTitle.classList.remove('hide')
      promptTitle.innerHTML = roundItem.prompt.prompt
      controlPromptBlock.innerHTML = `<div class="block-title light">SUBMIT YOUR LIES NOW!</div>`

    }

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
        joinInfoBlock.innerHTML = 'Invalid room code entered or game already in progress.'
      } else {
        // Room joined successfully
        if (playerInfo.vip) { pageType = 'vip' } else { pageType = 'player' }
        headRoomBlock.innerHTML = `<div class="text note">ROOM CODE</div><div class="text main">${roomCode}</div>`
        if ( mainTitle.classList.contains('hide') ) mainTitle.classList.remove('hide')
        if ( subTitle.classList.contains('hide') ) subTitle.classList.remove('hide')
        mainTitle.innerHTML = 'KNOWING ME, KNOWING YOU'
        subTitle.innerHTML = 'How well do you know your friends?'
        if ( !promptTitle.classList.contains('hide') ) promptTitle.classList.add('hide')
        headAvatarBlock.innerHTML = `<img src="/icons/${playerInfo.icon}.jpg" alt="Goat" class="avatar-big">`
        if ( gameScreen.classList.contains('hide') ) gameScreen.classList.remove('hide')
        if ( !splashScreen.classList.contains('hide') ) splashScreen.classList.add('hide')
        if ( playerJoinBlock.classList.contains('hide') ) playerJoinBlock.classList.remove('hide')
        if ( pageType === 'vip' ) {
          if ( playerVIPMsg.classList.contains('hide') ) playerVIPMsg.classList.remove('hide')
          if ( !playerJoinMsg.classList.contains('hide') ) playerJoinMsg.classList.add('hide')
          gameReadyButton.addEventListener('click', gameReady)
          
          // Let the server know the players are ready
          function gameReady() {
            socket.emit('room-ready', roomCode)
          }

        } else {
          if ( !playerVIPMsg.classList.contains('hide') ) playerVIPMsg.classList.add('hide')
          if ( playerJoinMsg.classList.contains('hide') ) playerJoinMsg.classList.remove('hide')          
        }
      }
    })

    socket.on('set-prompts', promptInfo => {
      if (promptInfo.room === roomCode) {
        promptInfo.promptData.forEach (item => {
          if (item.for === playerName) {
            setPrompt(item.prompt, item.promptDetail, promptInfo.action)
          }
        })
      }
    })

    function setPrompt(promptText, promptDetail, action) {
      if ( !playerJoinBlock.classList.contains('hide') ) playerJoinBlock.classList.add('hide')
      if ( !playerWaitBlock.classList.contains('hide') ) playerWaitBlock.classList.add('hide')
      if ( playerInputBlock.classList.contains('hide') ) playerInputBlock.classList.remove('hide')
      if ( !mainTitle.classList.contains('hide') ) mainTitle.classList.add('hide')
      if ( !subTitle.classList.contains('hide') ) subTitle.classList.add('hide')
      if ( promptTitle.classList.contains('hide') ) promptTitle.classList.remove('hide')
      promptTitle.innerHTML = promptText
      playerInputBlock.innerHTML = `<input type="text" id="player-input-box" name="input" max-length="100"><div class="holder"><button id="player-input-submit" type="submit" class="green">SUBMIT</button></div><div class="block-title light">${promptDetail}</div><div class="block-info"></div>`

      // Check for response and submit
      document.querySelector('#player-input-submit').addEventListener('click', (input) => {
        socket.emit('submit-prompt', { room: roomCode, from: playerName, submission: document.querySelector('#player-input-box').value.toUpperCase() })
        console.log(action)
        if (action === 'wait') {
          if ( !playerInputBlock.classList.contains('hide') ) playerInputBlock.classList.add('hide')
          if ( playerWaitBlock.classList.contains('hide') ) playerWaitBlock.classList.remove('hide')
        }
      })
    }

  }

})

// FUNCTIONS
function shuffle(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array
}