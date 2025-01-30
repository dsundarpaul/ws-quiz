import { gameConfig } from "../config/gameConfig.js";

class GameState {
  constructor(gameRoom, players) {
    this.gameRoom = gameRoom;
    this.currentQuestionIndex = 0;
    this.players = players;
    this.scores = this._initializeScores(players);
    this.selections = new Map();
    this.timerInterval = null;
  }

  _initializeScores(players) {
    return players.reduce((acc, player) => {
      acc[player.socketId] = 0;
      return acc;
    }, {});
  }

  recordSelection(playerId, optionId) {
    this.selections.set(playerId, optionId);
    return this.selections.size;
  }

  updateScore(playerId) {
    this.scores[playerId] += 10;
  }

  clearSelections() {
    this.selections.clear();
  }

  moveToNextQuestion() {
    this.currentQuestionIndex++;
    this.clearSelections();
  }

  isGameComplete() {
    return this.currentQuestionIndex >= gameConfig.QUESTIONS_PER_GAME;
  }

  getResults() {
    return {
      scores: this.scores,
      players: this.players
    };
  }
}

export default GameState