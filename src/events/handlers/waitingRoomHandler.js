import { EVENT_TYPES } from '../eventTypes.js';
import { validatePlayerName } from '../../utils/validation.js';
import logger from '../../utils/logger.js';
import { gameConfig } from '../../config/gameConfig.js';

class WaitingRoomHandler {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  handleJoinWaitingRoom(socket, data) {
    try {
      validatePlayerName(data.playerName);
      
      logger.info(`Player joining waiting room: ${socket.id}`);
      socket.join("WAITING-ROOM");

      const waitingPlayers = this.gameManager.addWaitingPlayer(socket, data.playerName);
      logger.info(`Waiting players: ${waitingPlayers}`);

      socket.to("WAITING-ROOM").emit(EVENT_TYPES.JOINED_WAITING_ROOM, waitingPlayers);
      socket.emit(EVENT_TYPES.JOINED_WAITING_ROOM, waitingPlayers);

      if (waitingPlayers.length === gameConfig.MAX_PLAYERS) {
        this.gameManager.startGame();
      }
    } catch (error) {
      logger.error(`Error in waiting room handler: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  }
}

export default WaitingRoomHandler;