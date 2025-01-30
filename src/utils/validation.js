export const validatePlayerName = (playerName) => {
  if (!playerName || typeof playerName !== 'string') {
    throw new Error('Invalid player name');
  }
  if (playerName.length < 2 || playerName.length > 20) {
    throw new Error('Player name must be between 2 and 20 characters');
  }
};

export const validateOptionSelection = (optionId) => {
  if (typeof optionId !== 'number' || optionId < 0 || optionId > 3) {
    throw new Error('Invalid option selection');
  }
};