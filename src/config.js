export const WORLD = { width: 960, height: 540 };
export const activeLevelCount = 2;

export const images = {
  dorm: new Image(),
  dormWalkMask: new Image(),
  playground: new Image(),
  playgroundWalkMask: new Image(),
  playerAtlas: new Image(),
  matronAtlas: new Image(),
  guardAtlas: new Image(),
};

images.dorm.src = "assets/dorm1-bg.png?v=20260523b";
images.dormWalkMask.src = "assets/dorm-bgwalkarea.svg?v=20260601";
images.playground.src = "assets/dorm2-bg.png";
images.playgroundWalkMask.src = "assets/playground-walkarea.svg?v=20260601";
images.playerAtlas.src = "assets/lv.png";
images.matronAtlas.src = "assets/hongdou.png";
images.guardAtlas.src = "assets/dahongdou.png";

export const characterAtlases = {
  player: {
    json: "assets/lv.json",
    image: images.playerAtlas,
    defaultSize: { w: 78, h: 74 },
    naturalFacing: "left",
    frameDurations: { default: 4 / 60, idle: 14 / 60, walk: 6 / 60 },
    frameCounts: { attack: 4, hiddle: 1, hit: 1, idle: 3, walk: 9 },
  },
  matron: {
    json: "assets/hongfou.json",
    image: images.matronAtlas,
    defaultSize: { w: 99, h: 130 },
    naturalFacing: "right",
    frameDurations: { default: 4 / 60 },
    frameCounts: { walk: 14 },
  },
  guard: {
    json: "assets/dahongdou.json",
    image: images.guardAtlas,
    defaultSize: { w: 130, h: 130 },
    naturalFacing: "right",
    frameDurations: { default: 4 / 60, hit: 14 / 60 },
    frameCounts: { attack: 6, hit: 2, walk: 18 },
  },
};

export const audioFiles = {
  bgm: "assets/audio/bgm.wav",
  caught: "assets/audio/caught.wav",
  footsteps: ["assets/audio/footstep-1.wav", "assets/audio/footstep-2.wav"],
};

export const debug = {
  showWalkArea: false,
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
