document.addEventListener('DOMContentLoaded', () => {
  // STRUCTURE BLOCKS
  const blkSplash = document.querySelector('#splash')
  const blkGame = document.querySelector('#game')
  // Control
  const blkCtrlJoinCode = document.querySelector('#control-join-code')
  const blkCtrlJoinList = document.querySelector('#control-join-list')
  const blkCtrlReady = document.querySelector('#control-ready')
  const blkCtrlWait = document.querySelector('#control-wait')
  const blkCtrlShow = document.querySelector('#control-show')
  const blkCtrlScore = document.querySelector('#control-score')
  // Player
  const blkPlayJoin = document.querySelector('#player-join')
  const blkPlayWait = document.querySelector('#player-wait')
  const blkPlayInput = document.querySelector('#player-input')
  const blkPlayChoose = document.querySelector('#player-choose')

  // STRUCTURE ELEMENTS
  const elemHeadRound = document.querySelector('#head-round')
  const elemHeadAvatar = document.querySelector('#head-avatar')
  const elemHeadRoom = document.querySelector('#head-room')
  const elemTitleMain = document.querySelector('#title-main')
  const elemTitleSub = document.querySelector('#title-sub')
  const elemTitlePrompt = document.querySelector('#title-prompt')
  const elemInfoStart = document.querySelector('#info-start')
  const elemInfoJoin = document.querySelector('#info-join')

  // BUTTONS
  const btnStartRoomKMKY = document.querySelector('#start-room-kmky')
  const btnJoinGame = document.querySelector('#join-room')

  // INPUTS
  const inpRoomCode = document.querySelector('#join-room-code')
  const inpPlayName = document.querySelector('#join-player-name')

  // GAME SETTINGS
  let connType = ''
  let playInfo = { name: '', state: '', icon: '', vip: false, active: false }
  let roomInfo = { code: '', game: '', state: '', icons: [], players: [], gameData: null }
  let gameInfo = { type: '', numRounds: 0, curRound: { id: 0 }, gameData: null }
  let gameLabels = {
    'kmky': {title: 'Knowing me, Knowing You', subtitle: 'How well do you know your friends?', instructions: 'Players answer questions about themselves and then each other.<br />Points are awarded for guessing the true answers and getting other players to guess your lies!'}
  }

  // CONNECTION
  const socket = io()

  // LISTENERS
  btnStartRoomKMKY.addEventListener('click', function(){ startRoom('kmky') })
  btnJoinGame.addEventListener('click', joinRoom)

  // SERVER OUTPUT HANDLING
  // Room started
  socket.on('room-started', newRoomInfo => {
    if (newRoomInfo === null) {
      displayMessage(elemInfoStart, 'Unable to create new room. Server may be busy. Try again soon.', 'alert')
      connType = ''
      gameInfo.type = ''
    } else {
      roomInfo = newRoomInfo
      displayMessage(elemInfoStart, `Created room ${roomInfo.code}`, 'success')
      setRoomState('join')
      setTitle(gameLabels[roomInfo.game].title, gameLabels[roomInfo.game].subtitle)
      setRoomCode(roomInfo.code)
      
      blkCtrlJoinCode.innerHTML = createDiv(`<div class="text note">ROOM CODE</div><div class="text main">${roomInfo.code}</div>`,'item large all-skewed');
      blkCtrlJoinList.innerHTML = createDiv("WHO'S IN?", 'block-title')
    }
  })

  // Room updated
  socket.on('room-updated', roomData => {
    if (connType === 'room') {
      roomData.forEach( room => {
        if (room.code === roomInfo.code) {
          roomInfo = room
          blkCtrlJoinList.innerHTML = createDiv("WHO'S IN?", 'block-title')
          room.players.forEach( player => {
            if (player.active) { playerType = '' } else { playerType = 'inactive' }
            blkCtrlJoinList.innerHTML += createWrapper('holder',[createPlayerDiv(player, playerType)])
          })
        }
      })
    }
  })

  // Room joined
  socket.on('room-joined', newPlayInfo => {
    if (newPlayInfo === null) {
      displayMessage(elemInfoJoin, 'Invalid room code, duplicate name or game already in progress.', 'alert')
      connType = ''
      roomInfo.code = ''
      playInfo.name = ''
    } else {
      playInfo = newPlayInfo.player
      console.log(playInfo.name)
      roomInfo = newPlayInfo.room
      displayMessage(elemInfoJoin, `Joined room ${roomInfo.code} as ${playInfo.name}`, 'success')
      setPlayState('join')
      setTitle(gameLabels[roomInfo.game].title, gameLabels[roomInfo.game].subtitle)
      setAvatar(playInfo.icon)
      setRoomCode(roomInfo.code)
      if (playInfo.vip) {
        var btn = createButton('ready-room', 'ALL READY', 'link', 'green')
        var title = createDiv('YOU HAVE THE POWER!<br />START THE GAME WHEN EVERYONE HAS JOINED!', 'block-title light')
        blkPlayJoin.innerHTML = createWrapper('holder', [btn, title])
        document.querySelector('#ready-room').addEventListener('click', () => {
          socket.emit('ready-room', roomInfo.code)
          readyRoom()
        })
      } else {
        var title = createDiv("YOU'RE IN<br />WAITING FOR THE GAME TO START", 'block-title light')
        blkPlayJoin.innerHTML = createWrapper('holder', [title])
      }
    }
  })

  // Room closed
  socket.on('room-closed', roomCode => {
    if (roomInfo.code === roomCode) {
      location.reload()
    }
  })

  // Room ready
  socket.on('room-ready', roomCode => {
    if (roomInfo.code === roomCode) {
      readyRoom()
    }
  })


  // GAME FUNCTIONS
  // Start room
  function startRoom(gameType) {
    connType = 'room'
    gameInfo.type = gameType
    socket.emit('start-room', gameType)
  }

  // Join room
  function joinRoom() {
    connType = 'play'
    roomInfo.code = inpRoomCode.value.toUpperCase()
    playInfo.name = inpPlayName.value.toUpperCase()
    if (roomInfo.code !== '' && playInfo.name !== '') {
      socket.emit('join-room', { room: roomInfo.code, name: playInfo.name } )
    } else {
      displayMessage(elemInfoJoin, 'Valid room code and player name must be entered.<br />Room code can be found on the main game screen.', 'alert')
    }
  }

  // Ready room
  function readyRoom() {
    if (connType === 'room') {
      setRoomState('ready')
      blkCtrlReady.innerHTML = createDiv(gameLabels[roomInfo.game].instructions.toUpperCase(), 'block-title light')
      setTimeout(function(){ startGame(roomInfo.game) }, 5000)
    } else if (connType === 'play') {
      setPlayState('ready')
      blkPlayWait.innerHTML = createDiv(gameLabels[roomInfo.game].instructions.toUpperCase(), 'block-title light')
    }
  }

  // Start game
  function startGame(gameType) {
    console.log(`START GAME (${gameType})`)
  }

  // PROCESS FUNCTIONS
  function setPlayState(state) {
    playInfo.state = state
    // Show / hide appropriate sections for required player state
    if (state === 'join') {
      showHideElements([blkGame, blkPlayJoin], [blkSplash, blkPlayWait, blkPlayInput, blkPlayInput])
    } else if (state === 'ready') {
      showHideElements([blkGame, blkPlayWait], [blkSplash, blkPlayJoin, blkPlayInput, blkPlayInput])
    }
  }

  function setRoomState(state) {
    roomInfo.state = state
    socket.emit('room-state', roomInfo)
    // Show / hide appropriate sections for required room state
    if (state === 'join') {
      showHideElements([blkGame, blkCtrlJoinCode, blkCtrlJoinList], [blkSplash, blkCtrlReady, blkCtrlWait, blkCtrlShow, blkCtrlScore])
    } else if (state === 'ready') {
      showHideElements([blkGame, blkCtrlReady], [blkSplash, blkCtrlJoinCode, blkCtrlJoinList, blkCtrlWait, blkCtrlShow, blkCtrlScore])
    }
  }

  function createWrapper(type, content = [], id='') {
    // Wrap elements in div of specified type
    var wrapper = `<div id="${id}" class="${type}">`
    content.forEach(item => {
      wrapper += item
    })
    wrapper += `</div>`
    return wrapper
  }

  function createDiv(text, classList = '') {
    // Create properly formatted div
    return `<div class="${classList}">${text}</div>`
  }

  function createPlayerDiv(player, type='') {
    // Create formatted player div
    if (player.vip) { playerClass = 'vip' } else { playerClass = '' }
    if (type === 'inactive') { avatarClass = 'inactive' } else { avatarClass = '' }
    return `<div class="item all-skewed player">  <img src="/icons/${player.icon}.jpg" class="avatar ${avatarClass}">  <div class="name ${playerClass}">${player.name}</div></div>`
  }

  function createButton(id, text, type = 'link', classList = '') {
    // Create properly formatted button
    return `<button id="${id}" type="${type}" class="${classList}">${text}</button>`
  }

  function setAvatar(type = null) {
    if (type === null) {
      elemHeadAvatar.innerHTML = ''
    } else {
      elemHeadAvatar.innerHTML = `<img src="/icons/${type}.jpg" class="avatar-big">`
    }
    return
  }

  function setRoomCode(code = null) {
    if (code === null || code === '') {
      elemHeadRoom.innerHTML = ''
    } else {
      elemHeadRoom.innerHTML = `<div class="text note">ROOM CODE</div><div class="text main">${code}</div>`
    }    
    return
  }

  function setRoundNumber(round = null) {
    if (round === null || round === '') {
      elemHeadRound.innerHTML = ''
    } else {
      elemHeadRound.innerHTML = `<div class="text main">ROUND: ${round}</div>`
    }    
    return    
  }

  function setTitle(title, subtitle) {
    showHideElements([elemTitleMain, elemTitleSub], [elemTitlePrompt])
    elemTitleMain.innerHTML = title.toUpperCase()
    elemTitleSub.innerHTML = subtitle
  }

  function setPrompt(text) {
    showHideElements([elemTitlePrompt], [elemTitleMain, elemTitleSub])
    elemTitlePrompt.innerHTML = text.toUpperCase()
  }

  function adjustClasses(location, classesOn, classesOff) {
    // Enhanced toggle functionality making sure of right outcome regardless of starting state
    classesOn.forEach( className => { if ( !location.classList.contains(className) ) location.classList.add(className) })
    classesOff.forEach( className => { if ( location.classList.contains(className) ) location.classList.remove(className) })
  }

  function showHideElements(showElems, hideElems) {
    // Shows and hides the groups of elements for screen updates
    showElems.forEach( elem => { if ( elem.classList.contains('hide') ) elem.classList.remove('hide') })
    hideElems.forEach( elem => { if ( !elem.classList.contains('hide') ) elem.classList.add('hide') })
  }
  
  function displayMessage(location, msgContent, msgType) {
    // Adds an error or success message in the specified location - doesn't check if showing
    location.innerHTML = msgContent
    adjustClasses(location, [], ['alert', 'success'])
    if (msgType === 'alert') adjustClasses(location, ['alert'], [])
    if (msgType === 'success') adjustClasses(location, ['success'], [])
  }

})