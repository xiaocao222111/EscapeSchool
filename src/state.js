export const keys = new Set();
export const touchDirs = new Set();
export const controls = {
  speedBoost: false,
};

export const state = {
  lastTime: 0,
  lastFrameTime: 0,
  fps: 0,
  fpsFrames: 0,
  fpsLastTime: 0,
  preloadPromise: null,
  levelIndex: 0,
  gameState: "start",
  playerHp: 120,
  player: null,
  enemies: [],
  obstacles: [],
  exitZone: null,
  statusText: null,
  animationTime: 0,
  playerAction: null,
  playerActionTimer: 0,
  playerActionElapsed: 0,
  failureRestartTimer: null,
  camera: { x: 0, y: 0 },
  viewport: { width: 960, height: 540 },
  playerFootstepTimer: 0,
  npcFootstepTimer: 0,
};
