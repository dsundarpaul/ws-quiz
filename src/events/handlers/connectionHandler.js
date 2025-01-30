import { EVENT_TYPES } from '../eventTypes.js';
import logger from '../../utils/logger.js';

class ConnectionHandler {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  handleConnection(socket) {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on(EVENT_TYPES.DISCONNECT, () => {
      this.gameManager.handleDisconnect(socket);
      logger.info(`Client disconnected: ${socket.id}`);
    });
  }
}

export default ConnectionHandler;