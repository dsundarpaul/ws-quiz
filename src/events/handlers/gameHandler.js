import { EVENT_TYPES } from '../eventTypes.js';
import { validateOptionSelection } from '../../utils/validation.js';
import logger from '../../utils/logger.js';

class GameHandler {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager;
  }

  handleOptionSelection(socket, data) {
    try {
      validateOptionSelection(data.optionId);
      this.gameManager.handleOptionSelection(socket, data.optionId);
    } catch (error) {
      logger.error(`Error in game handler: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  }
}

export default GameHandler;