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
  let infoTime = 500
  let delayTime = 100

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
      setTitle(gameLabels[roomInfo.game].title.toUpperCase(), gameLabels[roomInfo.game].subtitle)
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
      roomInfo = newPlayInfo.room
      displayMessage(elemInfoJoin, `Joined room ${roomInfo.code} as ${playInfo.name}`, 'success')
      setPlayState('join')
      setTitle(gameLabels[roomInfo.game].title.toUpperCase(), gameLabels[roomInfo.game].subtitle)
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

  // Question asked
  socket.on('question-ask', questionInfo => {
    if (connType === 'play' && roomInfo.code === questionInfo.room) {
      // Show question to player (or holding message)
      setPlayState('wait')
      setPrompt(questionInfo.holdingTitle)
      blkPlayInput.innerHTML = createDiv(questionInfo.holdingText, 'block-title light')
      var questionSet = false
      questionInfo.questionData.forEach( question => {
        if (question.for === playInfo.name) {
          var questionSet = true
          setPlayState('input')
          setPrompt(question.title)
          blkPlayInput.innerHTML = `<input type="text" id="answer-input" name="input" maxlength="100"><div class="holder"><button id="answer-submit" type="submit" class="green">SUBMIT</button></div>`
          blkPlayInput.innerHTML += createDiv(question.detail.toUpperCase(), 'block-title light')
          document.querySelector('#answer-submit').addEventListener('click', (input) => {
            emitData = { room: questionInfo.room, game: questionInfo.game, from: question.for, answer: document.querySelector('#answer-input').value.toUpperCase() }
            socket.emit('question-answer', emitData)
            setPlayState('wait')
            blkPlayInput.innerHTML = createDiv('Waiting for all players to answer.'.toUpperCase(), 'block-title light')
          })
        }
      })
    }
  })

  // Question answered
  socket.on('question-answer', answerInfo => {
    if (connType === 'room' && roomInfo.code === answerInfo.room) {
      // Process answer if matching room information
      if (gameInfo.type === 'kmky' && gameInfo.curRound.curQuestion === 0) { processAnswer_kmky('truth', answerInfo) }
      else if (gameInfo.type === 'kmky') { processAnswer_kmky('lie', answerInfo) }
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
      setTimeout(function(){ startGame(roomInfo.game) }, infoTime)
    } else if (connType === 'play') {
      setPlayState('ready')
      blkPlayWait.innerHTML = createDiv(gameLabels[roomInfo.game].instructions.toUpperCase(), 'block-title light')
    }
  }

  // Start game
  function startGame(gameType) {
    if (gameType = 'kmky') {
      gameInfo = { type: gameType, numRounds: Math.floor(10 / roomInfo.players.length), curRound: { id: 0 }, gameData: shuffle(roomInfo.gameData) }
      startRound_kmky(1)
    } else {
      // Game not recognised - kick to reset room (and players via disconnect)
      reload()
    }
  }

  // KNOWING ME, KNOWING YOU FUNCTIONS
  // Reset for a new round
  function startRound_kmky(roundID) {
    // Check if new round allowed
    if (roundID > gameInfo.numRounds) {
      // GameOver
      endGame_kmky()
    } else {
      gameInfo.curRound = { id: roundID }
      setRoundNumber(roundID)
      gameInfo.curRound.curQuestion = 0
      gameInfo.curRound.questions = []
      roomInfo.players.forEach( player => {
        // Get questions for each player in the game
        var question = gameInfo.gameData.pop()
        var questionText = question.prompt.toUpperCase()
        questionText = questionText.replace("[PLAYER]", `<span class="highlight">${player.name}</span>`)
        var question = { target: player.name, question: questionText, truth: false, answers: [], dummies: question.answers }
        gameInfo.curRound.questions.push(question)
      })
      askInput_kmky('truths')
    }
  }

  // Ask a question
  function startQuestion_kmky(questionID) {
    if (questionID > gameInfo.curRound.questions.length) {
      // No more questions to process for round; try to start a new one
      startRound_kmky(gameInfo.curRound.id + 1)
    } else {
      gameInfo.curRound.curQuestion = questionID
      askInput_kmky('lies', questionID)
    }
  }

  // Ask players for input
  function askInput_kmky(type, questionID = 0) {
    if (type === 'truths') {
      setRoomState('wait')
      blkCtrlWait.innerHTML = createDiv('ENTER YOUR TRUTHS ON YOUR DEVICES NOW!', 'block-title light')
      blkCtrlWait.innerHTML += createDiv('ANSWERS IN', 'block-title')
      var truthList = []
      gameInfo.curRound.questions.forEach( question => {
        // Add a truth prompt for all players
        truthList.push({ for: question.target, title: question.question, detail: 'Answer truthfully about yourself!' })
      })
      var emitData = { room: roomInfo.code, game: roomInfo.game, holdingTitle: truthList[0].title, holdingText: "Why haven't you been asked a question?".toUpperCase(), questionData: truthList }
      socket.emit('question-ask', emitData)
    } else if (type === 'lies') {
      setRoomState('wait')
      var question = gameInfo.curRound.questions[questionID - 1]
      setPrompt(question.question)
      blkCtrlWait.innerHTML = createDiv('ENTER A CONVINCING LIE ON YOUR DEVICES NOW!', 'block-title light')
      blkCtrlWait.innerHTML += createDiv('ANSWERS IN', 'block-title')
      var lieList = []
      roomInfo.players.forEach( player => {
        // Add a lie prompt for all players other than the target
        if ( player.name !== question.target ) lieList.push({ for: player.name, title: question.question, detail: 'Enter a convincing lie!' })
      })
      var emitData = { room: roomInfo.code, game: roomInfo.game, holdingTitle: question.question, holdingText: "You did this".toUpperCase(), questionData: lieList }
      socket.emit('question-ask', emitData)
    }
  }

  // Process question answers
  function processAnswer_kmky(type, answerInfo) {
    if (type === 'truth') {
      var checkTruths = 0
      gameInfo.curRound.questions.forEach( question => {
        if ( question.target === answerInfo.from ) {
          // Update question data where have answer
          question.truth = true
          question.answers.push({ text: answerInfo.answer, type: true })
        }
        if (question.truth) checkTruths += 1
      })
      if (checkTruths === gameInfo.curRound.questions.length) {
        // All players have submitted truths
        setTimeout(function(){ startQuestion_kmky(1) }, delayTime)
      }
    } else if (type === 'lie') {
      var question = gameInfo.curRound.questions[gameInfo.curRound.curQuestion - 1]
      question.answers.push({ text: answerInfo.answer, type: false, by: answerInfo.from })
      if (question.answers.length === roomInfo.players.length) {
        var dummies = shuffle(question.dummies)
        for (var i = question.answers.length; i < 4; i++) {
          question.answers.push({ text: dummies.pop().toUpperCase(), type: false, by: 'GAME'})
        }
        setTimeout(function(){ showAnswers_kmky() }, delayTime)
      }
    }
    roomInfo.players.forEach(player => {
      if (player.name === answerInfo.from) blkCtrlWait.innerHTML += createWrapper('holder',[createPlayerDiv(player, playerType)])
    })
  }

  // Show answers
  function showAnswers_kmky() {
    setRoomState('show')
    var questionID = gameInfo.curRound.curQuestion
    gameInfo.curRound.questions[questionID - 1].answers = shuffle(gameInfo.curRound.questions[questionID - 1].answers) // Shuffle answer list
    var question = gameInfo.curRound.questions[questionID - 1]
    blkCtrlShow.innerHTML = ''
    setPrompt(question.question)
    var itemID = 1
    question.answers.forEach( answer => {
      blkCtrlShow.innerHTML += createWrapper('holder', [createDiv(`<div class="text main">${answer.text.toUpperCase()}</div>`, 'item all-skewed')], `vote-item-${itemID}`)
      itemID += 1
    })
  }

  // End game
  function endGame_kmky() {
    console.log('GAME OVER MAN! GAME OVER!')
  }

  // PROCESS FUNCTIONS
  function setPlayState(state) {
    playInfo.state = state
    // Show / hide appropriate sections for required player state
    if (state === 'join') {
      showHideElements([blkGame, blkPlayJoin], [blkSplash, blkPlayWait, blkPlayInput, blkPlayChoose])
    } else if (state === 'ready') {
      showHideElements([blkGame, blkPlayWait], [blkSplash, blkPlayJoin, blkPlayInput, blkPlayChoose])
    } else if (state === 'input') {
      showHideElements([blkGame, blkPlayInput], [blkSplash, blkPlayJoin, blkPlayWait, blkPlayChoose])
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
    } else if (state === 'wait') {
      showHideElements([blkGame, blkCtrlWait], [blkSplash, blkCtrlJoinCode, blkCtrlJoinList, blkCtrlReady, blkCtrlShow, blkCtrlScore])
    } else if (state === 'show') {
      showHideElements([blkGame, blkCtrlShow], [blkSplash, blkCtrlJoinCode, blkCtrlJoinList, blkCtrlReady, blkCtrlWait, blkCtrlScore])
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
      elemHeadRound.innerHTML = `<div class="text main">ROUND ${round}</div>`
    }    
    return    
  }

  function setTitle(title, subtitle) {
    showHideElements([elemTitleMain, elemTitleSub], [elemTitlePrompt])
    elemTitleMain.innerHTML = title
    elemTitleSub.innerHTML = subtitle
  }

  function setPrompt(text) {
    showHideElements([elemTitlePrompt], [elemTitleMain, elemTitleSub])
    elemTitlePrompt.innerHTML = text
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

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array
  }

})