function createAtlas(imagePath, jsonPath) {
  const image = new Image();
  image.src = imagePath;
  return {
    image,
    jsonPath,
    status: "idle",
    promise: null,
    frames: new Map(),
    meta: { width: 0, height: 0 },
    urls: new Map(),
  };
}

const startAtlas = createAtlas("assets/ui.png", "assets/ui.json");
const startStoryAtlas = createAtlas("assets/start.png?v=20260608-keyboard-boost-1", "assets/start.json?v=20260608-keyboard-boost-1");
const gameUiAtlas = createAtlas("assets/ui2.png?v=20260607-crop-fix-1", "assets/ui2.json?v=20260607-crop-fix-1");

function frameName(filename) {
  return filename.replace(/\.[^.]+$/, "");
}

function decodeImage(image) {
  if (image.complete) {
    if (image.naturalWidth <= 0) return Promise.resolve(false);
    return (image.decode?.().then(() => true).catch(() => true)) || Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const done = (loaded) => {
      resolve(loaded);
    };
    image.addEventListener("load", () => image.decode?.().then(() => done(true)).catch(() => done(true)) || done(true), { once: true });
    image.addEventListener("error", () => done(false), { once: true });
  });
}

function preloadAtlas(atlas) {
  if (atlas.promise) return atlas.promise;
  if (atlas.status !== "idle") return Promise.resolve(atlas);
  atlas.status = "loading";

  atlas.promise = Promise.all([
    fetch(atlas.jsonPath).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${atlas.jsonPath}`);
      return response.json();
    }),
    decodeImage(atlas.image),
  ])
    .then(([data, imageReady]) => {
      if (!imageReady || atlas.image.naturalWidth <= 0) throw new Error(`Failed to load ${atlas.image.src}`);
      atlas.frames.clear();
      atlas.meta = {
        width: data.meta?.size?.w || atlas.image.naturalWidth || 0,
        height: data.meta?.size?.h || atlas.image.naturalHeight || 0,
      };
      for (const item of data.frames || []) {
        atlas.frames.set(frameName(item.filename), item.frame);
      }
      atlas.status = "ready";
      return atlas;
    })
    .catch(() => {
      atlas.status = "failed";
      return atlas;
    });

  return atlas.promise;
}

export function preloadUiAtlas() {
  return preloadAtlas(startAtlas);
}

export function preloadGameUiAtlas() {
  return preloadAtlas(gameUiAtlas);
}

export function preloadStartStoryAtlas() {
  return preloadAtlas(startStoryAtlas);
}

function getFrameUrl(atlas, name) {
  if (atlas.urls.has(name)) return atlas.urls.get(name);
  const frame = atlas.frames.get(name);
  if (!frame || !atlas.image.complete || atlas.image.naturalWidth <= 0) return "";

  const canvas = document.createElement("canvas");
  canvas.width = frame.w;
  canvas.height = frame.h;
  canvas.getContext("2d").drawImage(atlas.image, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);

  const url = canvas.toDataURL("image/png");
  atlas.urls.set(name, url);
  return url;
}

function setFrameBackground(atlas, element, name) {
  const url = getFrameUrl(atlas, name);
  if (!url) return false;
  element.style.backgroundImage = `url("${url}")`;
  return true;
}

function setFrameImage(atlas, element, name) {
  const url = getFrameUrl(atlas, name);
  if (!url) return;
  element.src = url;
}

export async function getStartStoryPanels() {
  await preloadStartStoryAtlas();
  if (startStoryAtlas.status !== "ready") return [];

  return [...startStoryAtlas.frames.keys()]
    .filter((name) => name.startsWith("start_"))
    .sort((a, b) => {
      const aIndex = Number(a.match(/\d+$/)?.[0] || 0);
      const bIndex = Number(b.match(/\d+$/)?.[0] || 0);
      return aIndex - bIndex;
    })
    .map((name) => {
      const frame = startStoryAtlas.frames.get(name);
      const url = getFrameUrl(startStoryAtlas, name);
      if (!frame || !url) return null;
      return {
        name,
        url,
        x: frame.x,
        y: frame.y,
        w: frame.w,
        h: frame.h,
        atlasW: startStoryAtlas.meta.width,
        atlasH: startStoryAtlas.meta.height,
      };
    })
    .filter(Boolean);
}

export async function applyStartScreenAtlas(elements) {
  await preloadUiAtlas();
  if (startAtlas.status !== "ready") return false;

  setFrameBackground(startAtlas, elements.startScreen, "start-bg");
  setFrameBackground(startAtlas, elements.startTitleImg, "start-title");
  setFrameBackground(startAtlas, elements.startGameImg, "start-button");
  setStartSoundFrame(elements, false);
  return true;
}

export function setStartSoundFrame(elements, muted) {
  if (startAtlas.status !== "ready") return;
  setFrameBackground(startAtlas, elements.startSoundImg, muted ? "sound-off" : "sound-on");
}

export async function applyGameUiAtlas(elements) {
  await preloadGameUiAtlas();
  if (gameUiAtlas.status !== "ready") return false;

  setFrameBackground(gameUiAtlas, elements.dpad, "btn_move");
  setFrameBackground(gameUiAtlas, elements.attackBtn, "btn_attack");
  setFrameBackground(gameUiAtlas, elements.homeToggleBtn, "btn_back");
  setFrameBackground(gameUiAtlas, elements.failurePanel, "popup_bg");
  setFrameBackground(gameUiAtlas, elements.restartLevelBtn, "popup_button1");
  setFrameBackground(gameUiAtlas, elements.restartGameBtn, "popup_button2");
  setFrameImage(gameUiAtlas, elements.failureCharacter, "pic");
  setGameSoundFrame(elements, false);
  return true;
}

export function setGameSoundFrame(elements, muted) {
  if (gameUiAtlas.status !== "ready") return;
  if (muted) {
    setFrameBackground(gameUiAtlas, elements.soundToggleBtn, "bnt_soundoff")
      || setFrameBackground(gameUiAtlas, elements.soundToggleBtn, "btn_soundoff");
    return;
  }
  setFrameBackground(gameUiAtlas, elements.soundToggleBtn, "btn_soundon")
    || setFrameBackground(gameUiAtlas, elements.soundToggleBtn, "bnt_soundon");
}
