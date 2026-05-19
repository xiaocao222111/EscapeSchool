export const keys = new Set();
export const touchDirs = new Set();

export const state = {
  lastTime: 0,
  levelIndex: 0,
  gameState: "playing",
  player: null,
  enemies: [],
  obstacles: [],
  exitZone: null,
  attackEffect: null,
  damageFlash: 0,
  failureRestartTimer: null,
  camera: { x: 0, y: 0 },
  footstepTimer: 0,
};
