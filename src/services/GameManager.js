import { questions } from "../utils/constants.js";
import GameState from "../models/gameState.js";
import { gameConfig } from "../config/gameConfig.js";

class GameManger {
  constructor(io) {
    this.io = io;
    this.waitingPlayers = [];
    this.activeGames = new Map();
  }

  getPlayerColor(index) {
    return gameConfig.PLAYER_COLORS[index % gameConfig.PLAYER_COLORS.length];
  }

  addWaitingPlayer(socket, playerName) { 
    const playerColor = this.getPlayerColor(this.waitingPlayers.length); 
    const player = { 
      socketId: socket.id, 
      playerName: playerName || `New Player ${this.waitingPlayers.length + 1}`,
      color: playerColor
    }
    
    if(!this.waitingPlayers.find(item => item.socketId === socket.id)) {
      this.waitingPlayers.push(player); 
    }
    
    return this.waitingPlayers; 
  }
  
  removeWaitingPlayer(socketId) {
    this.waitingPlayers = this.waitingPlayers.filter(p => p.socketId !== socketId);
    return this.waitingPlayers;
  }
  
  startGame() {
    const gameRoom = `GAME_ROOM_${Date.now()})`;
    const gameState = new GameState(gameRoom, [...this.waitingPlayers]);
    this.activeGames.set(gameRoom, gameState);

    this.waitingPlayers.forEach(player => {
      const playerSocket = this.io.sockets.sockets.get(player.socketId);
      if(playerSocket) {
        playerSocket.leave("WAITING-ROOM");
        playerSocket.join(gameRoom);
      }
    });

    this.io.to(gameRoom).emit("start-game", {
      room: gameRoom,
      players: gameState.players,
      question: questions[0],
      currentQuestionNumber: 1,
      totalQuestions: gameConfig.QUESTIONS_PER_GAME
    });

    this.waitingPlayers = [];
    this.startGameTimer(gameRoom);
  }

  handleOptionSelection(socket, optionId) {
    const gameRoom = Array.from(socket.rooms).find(room => room.startsWith('GAME_ROOM_'));
    if(!gameRoom) return;

    const gameState = this.activeGames.get(gameRoom);
    if(!gameState) return;

    const currentQuestion = questions[gameState.currentQuestionIndex];

    if(gameState.selections.size === 0) {
      gameState.recordSelection(socket.id, optionId);

      if(optionId === currentQuestion.correct) {
        gameState.updateScore(socket.id);
      }

      this.io.to(gameRoom).emit("player-selected-option", {
        playerId: socket.id,
        playerColor: gameState.players.find(p => p.socketId === socket.id)?.color, optionId
      });

      setTimeout(() => this.moveToNextQuestion(gameRoom, gameState),
        gameConfig.NEXT_QUESTION_DELAY);
    }
  }

  moveToNextQuestion(gameRoom, gameState) {
    gameState.moveToNextQuestion();

    if(!gameState.isGameComplete()) {
      const nextQuestion = questions[gameState.currentQuestionIndex];
      this.io.to(gameRoom).emit("next-question", {
        question: nextQuestion,
        currentQuestionNumber: gameState.currentQuestionIndex + 1,
        totalQuestions: gameConfig.QUESTIONS_PER_GAME
      });
    } else {
      this.endGame(gameRoom);
    }
  }

  endGame(gameRoom) {
    const gameState = this.activeGames.get(gameRoom);
    if(gameState) {
      this.io.to(gameRoom).emit("game-complete", gameState.getResults());

      if(gameState.timeInterval) {
        clearInterval(gameState.timerInterval);
      }

      this.cleanupGameRoom(gameRoom);
      this.activeGames.delete(gameRoom);
      this.io.to(gameRoom).emit("game-over");
    }
  }

  cleanupGameRoom(gameRoom) {
    const room = this.io.sockets.adapter.rooms.get(gameRoom);
    if(room) {
      room.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if(socket) {
          socket.leave(gameRoom);
        }
      })
    }
  }

  startGameTimer(gameRoom) {
    const gameState = this.activeGames.get(gameRoom);
    let gameTime = gameConfig.GAME_DURATION;

    const gameInterval = setInterval(() => {
      if(!this.activeGames.has(gameRoom)) {
        clearInterval(gameInterval);
        return;
      }

      if(gameTime > 0) {
        gameTime--;
        this.io.to(gameRoom).emit("game-timer", gameTime);
      } else {
        clearInterval(gameInterval);
        this.endGame(gameRoom);
      }
    }, 1000);

    gameState.timerInterval = gameInterval;
  }

  handleDisconnect(socket) {
    const gameRoom = Array.from(socket.rooms).find(room => room.startWith('GAME_ROOM_'));

    if(gameRoom && this.activeGames.has(gameRoom)) {
      this.endGame(gameRoom);
    }

    const updatedWaitingPlayers = this.removeWaitingPlayer(socket.id);
    this.io.to("WAITING-ROOM").emit("joined-waiting-room", updatedWaitingPlayers);
  }
}

export default GameManger