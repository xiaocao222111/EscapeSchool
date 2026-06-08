import { bindInput } from "./input.js?v=20260608-progress-4";
import { balance, images, performance } from "./config.js";
import { render } from "./render.js?v=20260608-progress-4";
import { preloadCharacterAtlases } from "./spriteAnimator.js";
import { state } from "./state.js";
import { initLevel, update } from "./systems.js?v=20260608-progress-4";
import { applyGameUiAtlas, applyStartScreenAtlas, getStartStoryPanels } from "./uiAtlas.js?v=20260608-keyboard-boost-1";
import { elements, hideStartScreen, setStartLoading, showStartScreen, updateSoundToggle } from "./ui.js?v=20260608-progress-4";
import { resizeViewport } from "./viewport.js?v=20260608-progress-4";

const PRELOAD_TASK_TIMEOUT = 4500;
const AUTO_START_DELAY = 360;
let startupAutoStarted = false;

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

function preloadWithProgress(tasks) {
  let completed = 0;
  const total = tasks.length;

  setStartLoading(true, { progress: 0, label: "资源加载中", blockStart: false });

  function updateProgress(label) {
    const progress = total > 0 ? completed / total : 1;
    setStartLoading(true, {
      progress,
      label,
      blockStart: state.gameState !== "start",
    });
  }

  function runTask(task) {
    return Promise.race([
      Promise.resolve().then(task.run),
      new Promise((resolve) => setTimeout(resolve, PRELOAD_TASK_TIMEOUT)),
    ]);
  }

  return Promise.all(tasks.map((task) => runTask(task)
    .catch(() => null)
    .finally(() => {
      completed += 1;
      updateProgress(completed >= total ? "加载完成" : task.label);
    })))
    .finally(() => {
      state.preloadReady = true;
      if (state.gameState === "start" && !startupAutoStarted) {
        startupAutoStarted = true;
        setStartLoading(true, {
          progress: 1,
          label: "进入游戏",
          blockStart: true,
        });
        setTimeout(() => {
          if (state.gameState !== "start") return;
          state.playerHp = balance.playerMaxHp;
          initLevel(0);
          hideStartScreen();
        }, AUTO_START_DELAY);
        return;
      }
      setStartLoading(false, { progress: 1, label: "加载完成" });
    });
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
state.preloadPromise = preloadWithProgress([
  { label: "界面资源", run: () => applyStartScreenAtlas(elements).then(updateSoundToggle) },
  { label: "场景地图", run: preloadGameImages },
  { label: "角色动画", run: preloadCharacterAtlases },
  { label: "游戏控件", run: () => applyGameUiAtlas(elements).then(updateSoundToggle) },
  { label: "剧情图片", run: getStartStoryPanels },
]);
showStartScreen();
window.addEventListener("resize", () => {
  if (resizeViewport()) state.lastFrameTime = 0;
});
window.visualViewport?.addEventListener("resize", () => {
  if (resizeViewport()) state.lastFrameTime = 0;
});
requestAnimationFrame(loop);
