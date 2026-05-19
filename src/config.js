export const WORLD = { width: 960, height: 540 };

export const images = {
  dorm: new Image(),
  obstacle1: new Image(),
  player: new Image(),
};

images.dorm.src = "assets/dorm-bg.png";
images.obstacle1.src = "assets/obstacle1.png";
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

export const failureResults = ["全校通报批评", "叫家长", "写检讨"];
