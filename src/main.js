import { bindInput } from "./input.js?v=20260608-keyboard-boost-1";
import { images, performance } from "./config.js";
import { render } from "./render.js?v=20260608-keyboard-boost-1";
import { preloadCharacterAtlases } from "./spriteAnimator.js";
import { state } from "./state.js";
import { update } from "./systems.js?v=20260608-keyboard-boost-1";
import { applyGameUiAtlas, applyStartScreenAtlas } from "./uiAtlas.js?v=20260608-keyboard-boost-1";
import { elements, showStartScreen, updateSoundToggle } from "./ui.js?v=20260608-keyboard-boost-1";
import { resizeViewport } from "./viewport.js?v=20260608-keyboard-boost-1";

function getFrameInterval() {
  const isMobile = matchMedia("(pointer: coarse), (max-height: 600px)").matches;
  return 1000 / (isMobile ? performance.mobileFps : performance.desktopFps);
}

function decodeImage(image) {
  if (!image) return Promise.resolve();
  if (image.complete && image.naturalWidth > 0) return image.decode?.().catch(() => {}) || Promise.resolve();

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2000);
    const done = () => {
      clearTimeout(timeout);
      resolve();
    };
    image.addEventListener("load", () => image.decode?.().catch(() => {}).finally(done), { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

function preloadGameImages() {
  return Promise.all([
    decodeImage(images.dorm),
    decodeImage(images.dormWalkMask),
    decodeImage(images.playground),
    decodeImage(images.playgroundWalkMask),
  ]);
}

function loop(time) {
  if (document.hidden) {
    state.lastTime = time;
    state.lastFrameTime = time;
    requestAnimationFrame(loop);
    return;
  }

  if (time - state.lastFrameTime < getFrameInterval()) {
    requestAnimationFrame(loop);
    return;
  }

  const dt = Math.min(0.05, (time - state.lastTime) / 1000 || 0);
  state.lastFrameTime = time;
  state.lastTime = time;

  if (state.gameState === "playing") {
    update(dt);
    render();
  } else if (state.gameState === "paused" || state.gameState === "failed") {
    render();
  }

  requestAnimationFrame(loop);
}

bindInput();
resizeViewport();
state.preloadPromise = Promise.all([
  preloadCharacterAtlases(),
  preloadGameImages(),
  applyGameUiAtlas(elements).then(updateSoundToggle),
]);
applyStartScreenAtlas(elements).then(updateSoundToggle);
showStartScreen();
window.addEventListener("resize", () => {
  if (resizeViewport()) state.lastFrameTime = 0;
});
window.visualViewport?.addEventListener("resize", () => {
  if (resizeViewport()) state.lastFrameTime = 0;
});
requestAnimationFrame(loop);
