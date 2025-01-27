import { io } from "socket.io-client";

const btnJoinWaitin = document.getElementById("btn-join-waiting");
const inputPlayerName = document.getElementById("input-player-name");

const ROOM = "WAITING-ROOM";

const socket = io("http://localhost:3000");
// const userSocket = io("http://localhost:3000/user", { auth: { token: "" } });

socket.on("emit-jonined-game", (message) => updateJoinedPlayers(message));

btnJoinWaitin.addEventListener("click", () => {
  console.log(inputPlayerName?.value);
  const payload = {
    room: ROOM,
    playerName: inputPlayerName?.value || null
  }
  socket.emit("join-waiting-room", payload);
});

socket.on("joined-waiting-room", (players) => {
  console.log('Players in waiting room:', players);
  // Find my player info
  const myPlayer = players.find(p => p.socketId === socket.id);
  if (myPlayer) {
    console.log('My color:', myPlayer.color);
  }
  updateJoinedPlayers(players);
});

socket.on("emit-jonined-game", () => {
  console.log("joined game");
  // window.alert("Waiting tiemr stop");
});

socket.on("MATCH_ROOM", (playersList) => {
  displayPlayersList(playersList);
});

socket.on("start-game", ({ room, players, question, currentQuestionNumber, totalQuestions }) => {
  console.log(`Game started in room: ${room}`);
  currentPlayers = players;
  displayPlayersList(players);
  updateQuestionCounter(currentQuestionNumber, totalQuestions);
  displayQuestion(question);
});

socket.on("next-question", ({ question, currentQuestionNumber, totalQuestions }) => {
  updateQuestionCounter(currentQuestionNumber, totalQuestions);
  displayQuestion(question);
});

socket.on("game-complete", (results) => {
  displayResults(results);
});

socket.on("player-selected-option", ({ playerId, playerColor, optionId }) => {
  const optionElement = document.querySelector(`.board-cell[data-cell-id="${optionId}"]`);
  if (optionElement) {
    // Add border to show selection
    optionElement.style.borderColor = playerColor;
    optionElement.style.borderWidth = '4px';
    // Disable all options immediately when any player selects
    disableAllOptions();
  }
});

socket.on("game-timer", (time) => {
  console.log(`Game time remaining: ${time} seconds`);
  const timerElement = document.getElementById("game-timer");
  timerElement.textContent = `Time remaining: ${time} seconds`;
});

socket.on("game-over", () => {
  console.log("Game over");
  
  // Clear game state
  currentPlayers = [];
  currentQuestionNumber = 0;
  totalQuestions = 0;
  optionsEnabled = true;

  // Clear game board
  const gameBoard = document.getElementById("game-board");
  const questionElement = document.getElementById("question");
  const timerElement = document.getElementById("game-timer");

  // Reset timer
  timerElement.textContent = "Time remaining: 0 seconds";

  // Clear question
  questionElement.innerHTML = '';

  // Show game over message
  gameBoard.innerHTML = `
    <div class="game-over-message">
      <h2>Game Over!</h2>
      <button onclick="window.location.reload()">Play Again</button>
    </div>
  `;
});

const updateJoinedPlayers = (players) => {
  console.log('Updating joined players:', players);
  const playerCount = document.getElementById("waiting-players");
  
  while (playerCount.firstChild) {
    playerCount.firstChild.remove();
  }

  players?.forEach((player) => {
    const li = document.createElement("li");
    const colorBox = document.createElement("span");
    colorBox.className = 'player-color-box';
    colorBox.style.backgroundColor = player.color;
    
    li.appendChild(colorBox);
    li.appendChild(document.createTextNode(`${player.playerName} (${player.socketId})`));
    playerCount.appendChild(li);
  });
};

const startWaitingTimer = () => {
  window.alert("wating timer started");
};

const displayPlayersList = (playersList) => {
  const playerList = document.getElementById("players-list");

  while (playerList.firstChild) {
    playerList.firstChild.remove();
  }

  playersList.forEach((player) => {
    const li = document.createElement("li");
    const colorBox = document.createElement("span");
    colorBox.className = 'player-color-box';
    colorBox.style.backgroundColor = player.color;
    
    li.appendChild(colorBox);
    li.appendChild(document.createTextNode(`${player.playerName} (${player.socketId})`));
    playerList.appendChild(li);
  });
};

const startGameTimer = () => {
  const timerElement = document.createElement("div");
  timerElement.id = "game-timer";
  document.body.appendChild(timerElement);
};

// Add at the top with other variables
let optionsEnabled = true;

// Update the displayQuestion function
const displayQuestion = (question) => {
  const questionElement = document.getElementById("question");
  questionElement.textContent = question.text;

  // Reset options state
  optionsEnabled = true;

  // Clear previous selections and reset all buttons
  document.querySelectorAll('.board-cell').forEach(button => {
    button.textContent = '';
    button.style.borderColor = 'transparent';
    button.style.borderWidth = '2px';
    button.disabled = false;
    
    // Remove all event listeners
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
  });

  // Add new options
  question.options.forEach((option, index) => {
    const optionElement = document.querySelector(`.board-cell[data-cell-id="${index}"]`);
    if (optionElement) {
      optionElement.textContent = option;
      
      optionElement.addEventListener("click", () => {
        if (optionsEnabled) {
          socket.emit("select-option", { optionId: index });
          // Disable clicking for all players immediately
          disableAllOptions();
        }
      });
    }
  });
};

// Add new function to disable all options
const disableAllOptions = () => {
  optionsEnabled = false;
  document.querySelectorAll('.board-cell').forEach(button => {
    button.disabled = true;
  });
};

const getPlayerColor = (playerId) => {
  // Assign a unique color to each player based on their ID
  const colors = ["red", "blue", "green", "yellow"];
  return colors[playerId % colors.length];
};

// Helper function to get player color from the players list
let currentPlayers = [];
const getPlayerColorFromPlayers = (playerId) => {
  const player = currentPlayers.find(p => p.socketId === playerId);
  return player ? player.color : '#000000';
};

const updateQuestionCounter = (current, total) => {
  const questionElement = document.getElementById("question");
  questionElement.innerHTML = ''; // Clear previous content
  const counterHTML = `<div class="question-counter">Question ${current} of ${total}</div>`;
  questionElement.innerHTML = counterHTML;
};

const displayResults = (results) => {
  const gameBoard = document.getElementById("game-board");
  gameBoard.innerHTML = `
  <div>
    <div class="results-container">
      <h2>Game Results</h2>
      <div class="results-list">
        ${Object.entries(results.scores)
          .map(([playerId, score]) => {
            const player = results.players.find(p => p.socketId === playerId);
            return `
              <article class="result-item card">
                <span class="player-color" style="background-color: ${player.color}"></span>
                <span class="player-name text">${player.playerName}</span>
                <span class="player-score">${score} points</span>
              </article>
            `;
          })
          .join('')}
      </div>
    </div>
    <div class="game-over-message">
      <h2>Game Over!</h2>
      <button onclick="window.location.reload()">Play Again</button>
    </div>  
  </div>
  `;
};
