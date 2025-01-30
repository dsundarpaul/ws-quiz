export const gameConfig = {
  PORT: process.env.PORT || 3000,
  MAX_PLAYERS: 3,
  QUESTIONS_PER_GAME: 5,
  GAME_DURATION: 60,
  NEXT_QUESTION_DELAY: 1000,
  PLAYER_COLORS: ["#FF4136", "#2ECC40", "#0074D9", "#FFDC00", "#B10DC9"],
  CORS_ORIGINS: ["http://localhost:8080", "https://admin.socket.io"],
  CORS_CREDENTIALS: true
};