export const WORLD = { width: 960, height: 540 };

export const images = {
  dorm: new Image(),
  dormWalkMask: new Image(),
  obstacle1: new Image(),
  playground: new Image(),
  playgroundWalkMask: new Image(),
  player: new Image(),
};

images.dorm.src = "assets/dorm1-bg.png?v=20260523b";
images.dormWalkMask.src = "assets/dorm-bgwalkarea.svg?v=20260524";
images.obstacle1.src = "assets/obstacle1.png";
images.playground.src = "assets/dorm2-bg.png";
images.playgroundWalkMask.src = "assets/playground-walkarea.svg?v=20260524";
images.player.src = "assets/player.png";

export const audioFiles = {
  bgm: "assets/audio/bgm.wav",
  caught: "assets/audio/caught.wav",
  footsteps: ["assets/audio/footstep-1.wav", "assets/audio/footstep-2.wav"],
};

export const debug = {
  showWalkArea: true,
  invincible: false,
};

export const balance = {
  playerMaxHp: 120,
  playerSpeed: 88,
  playerAttackDamage: 1,
  playerAttackCooldown: 0.36,
  playerAttackRange: 56,
  playerAttackSize: 44,
  level1SeenDamage: 15,
  level1SeenInvincible: 1,
  guardAttackDamage: 20,
  guardAttackCooldown: 1.2,
  guardAttackRange: 48,
  guardAttackHeight: 28,
};

export const failureResults = ["全校通报批评", "叫家长", "写检讨"];
