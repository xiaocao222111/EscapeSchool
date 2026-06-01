export const keys = new Set();
export const touchDirs = new Set();

export const state = {
  lastTime: 0,
  levelIndex: 0,
  gameState: "start",
  playerHp: 120,
  player: null,
  enemies: [],
  obstacles: [],
  exitZone: null,
  attackEffect: null,
  animationTime: 0,
  playerAction: null,
  playerActionTimer: 0,
  playerActionElapsed: 0,
  damageFlash: 0,
  failureRestartTimer: null,
  camera: { x: 0, y: 0 },
  footstepTimer: 0,
};
