import { Server } from 'socket.io';
import { gameConfig } from './config/gameConfig.js';
import GameManager from './services/GameManager.js';
import ConnectionHandler from './events/handlers/connectionHandler.js';
import WaitingRoomHandler from './events/handlers/waitingRoomHandler.js';
import GameHandler from './events/handlers/gameHandler.js';
import { EVENT_TYPES } from './events/eventTypes.js';
import logger from './utils/logger.js';

const io = new Server(gameConfig.PORT, {
  cors: {
    origin: gameConfig.CORS_ORIGINS,
    credentials: gameConfig.CORS_CREDENTIALS
  }
});

const gameManager = new GameManager(io);
const connectionHandler = new ConnectionHandler(io, gameManager);
const waitingRoomHandler = new WaitingRoomHandler(io, gameManager);
const gameHandler = new GameHandler(io, gameManager);

io.on(EVENT_TYPES.CONNECTION, (socket) => {
  connectionHandler.handleConnection(socket);

  socket.on(EVENT_TYPES.JOIN_WAITING_ROOM, (data) => {
    waitingRoomHandler.handleJoinWaitingRoom(socket, data);
  });

  socket.on(EVENT_TYPES.SELECT_OPTION, (data) => {
    gameHandler.handleOptionSelection(socket, data);
  });
});

logger.info(`Server started on port ${gameConfig.PORT}`);