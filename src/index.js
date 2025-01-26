// import io from "socket-io";

// const ioo = io(3000, {
//   cors: {
//     origin: [],
//     Credentials: false,
//   },
// });

const io = require("socket.io")(3000, {
  cors: {
    origin: ["http://localhost:8080", "https://admin.socket.io"],
    credentials: true,
  },
});

console.log("server started at PORT: 3000");

// const matchIo = io.of("/match");

// matchIo.on();
let waitingPlayers = [];
let activeGames = new Map(); // To store active game rooms and their players
let playerSelections = new Map(); // To track which players have selected options
let gameScores = new Map(); // To track scores for each game room
const MAX_PLAYERS = 3;
const QUESTIONS_PER_GAME = 5; // Number of questions per game

const questions = [
  {
    text: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Mitochondria", "Ribosome", "Endoplasmic Reticulum"],
    correct: 1
  },
  {
    text: "Which of these is NOT a type of blood cell?",
    options: ["Lymphocyte", "Platelet", "Melanocyte", "Erythrocyte"],
    correct: 2
  },
  {
    text: "What is the largest organ in the human body?",
    options: ["Brain", "Liver", "Skin", "Heart"],
    correct: 2
  },
  {
    text: "Which organelle is responsible for protein synthesis?",
    options: ["Ribosome", "Golgi Body", "Lysosome", "Vacuole"],
    correct: 0
  },
  {
    text: "What is the process by which plants make their food?",
    options: ["Respiration", "Photosynthesis", "Fermentation", "Digestion"],
    correct: 1
  }
];

const getPlayerColor = (index) => {
  const colors = ["#FF4136", "#2ECC40", "#0074D9", "#FFDC00", "#B10DC9"];
  return colors[index % colors.length];
};

// Add new function to track game state
const createGameState = (gameRoom, players) => {
  return {
    currentQuestionIndex: 0,
    players: players,
    scores: players.reduce((acc, player) => {
      acc[player.socketId] = 0;
      return acc;
    }, {}),
    selections: new Map()
  };
};

io.on("connection", (socket) => {
  console.log("connected", socket.id);

  socket.on("join-waiting-room", (room) => {
    console.log("server:: player joined waiting", socket.id);
    socket.join("WAITING-ROOM");

    const playerColor = getPlayerColor(waitingPlayers.length);
    const roomEmitPayload = {
      socketId: socket.id,
      playerName: room.playerName || `New Player ${waitingPlayers.length + 1}`,
      color: playerColor
    };

    if (!waitingPlayers.find(item => item.socketId === socket.id)) {
      waitingPlayers.push(roomEmitPayload);
    }
    
    console.log("Current waiting players:", waitingPlayers);
    socket.to("WAITING-ROOM").emit("joined-waiting-room", waitingPlayers);
    socket.emit("joined-waiting-room", waitingPlayers);

    if (waitingPlayers.length === MAX_PLAYERS) {
      startGame();
    }
  });

  socket.on("select-option", ({ optionId }) => {
    const gameRoom = Array.from(socket.rooms).find(room => room.startsWith('GAME_ROOM_'));
    
    if (gameRoom) {
      const gameState = gameScores.get(gameRoom);
      if (!gameState) return;

      const currentQuestion = questions[gameState.currentQuestionIndex];
      
      // Check if this is the first selection for this question
      if (gameState.selections.size === 0) {
        // Record player's selection
        gameState.selections.set(socket.id, optionId);
        
        // Check if answer is correct and update score
        if (optionId === currentQuestion.correct) {
          gameState.scores[socket.id] += 10;
        }

        // Emit selection to all players
        io.to(gameRoom).emit("player-selected-option", { 
          playerId: socket.id,
          playerColor: gameState.players.find(p => p.socketId === socket.id)?.color,
          optionId 
        });

        // Move to next question immediately
        setTimeout(() => {
          moveToNextQuestion(gameRoom, gameState);
        }, 1000); // Short delay to show selection
      }
    }
  });

  const moveToNextQuestion = (gameRoom, gameState) => {
    gameState.currentQuestionIndex++;
    gameState.selections.clear();

    if (gameState.currentQuestionIndex < QUESTIONS_PER_GAME) {
      // Send next question
      const nextQuestion = questions[gameState.currentQuestionIndex];
      io.to(gameRoom).emit("next-question", { 
        question: nextQuestion,
        currentQuestionNumber: gameState.currentQuestionIndex + 1,
        totalQuestions: QUESTIONS_PER_GAME
      });
    } else {
      // Game is complete, show final results
      const results = {
        scores: gameState.scores,
        players: gameState.players
      };
      io.to(gameRoom).emit("game-complete", results);
      endGame(gameRoom);
    }
  };

  const startGame = () => {
    const gameRoom = `GAME_ROOM_${Date.now()}`;
    const firstQuestion = questions[0];
    
    // Initialize game state
    const gameState = createGameState(gameRoom, [...waitingPlayers]);
    gameScores.set(gameRoom, gameState);
    
    waitingPlayers.forEach(player => {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.leave("WAITING-ROOM");
        playerSocket.join(gameRoom);
      }
    });

    io.to(gameRoom).emit("start-game", { 
      room: gameRoom, 
      players: gameState.players,
      question: firstQuestion,
      currentQuestionNumber: 1,
      totalQuestions: QUESTIONS_PER_GAME
    });
    
    waitingPlayers = [];
    startGameTimer(gameRoom);
  };

  const endGame = (gameRoom) => {
    gameScores.delete(gameRoom);
    activeGames.delete(gameRoom);
    io.to(gameRoom).emit("game-over");
  };

  const startGameTimer = (gameRoom) => {
    let gameTime = 60;
    const gameInterval = setInterval(() => {
      if (gameTime > 0) {
        gameTime--;
        io.to(gameRoom).emit("game-timer", gameTime);
      } else {
        clearInterval(gameInterval);
        endGame(gameRoom); // Use the new endGame function
      }
    }, 1000);
  };
});
