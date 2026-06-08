import { toggleSound, unlockAudio } from "./audio.js?v=20260607-audio-buffer-1";
import { balance } from "./config.js";
import { getStartStoryPanels } from "./uiAtlas.js?v=20260608-progress-7";
import { controls, keys, state, touchDirs } from "./state.js";
import { attack, initLevel, returnToStartScreen } from "./systems.js?v=20260608-progress-7";
import {
  elements,
  hideStartStory,
  hideStartScreen,
  revealStartStoryPanel,
  setStartLoading,
  setupStartStoryPanels,
  updateSoundToggle,
} from "./ui.js?v=20260608-progress-7";

let lastSoundToggleAt = 0;
let storySkipRequested = false;
let resolveStoryDelay = null;

const START_STORY_TIMEOUT = 1600;

function waitForPreload() {
  if (!state.preloadPromise) return Promise.resolve();
  return Promise.race([
    state.preloadPromise,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

function delayStory(ms) {
  if (storySkipRequested) return Promise.resolve();

  return new Promise((resolve) => {
    const timeout = setTimeout(done, ms);
    resolveStoryDelay = done;

    function done() {
      clearTimeout(timeout);
      if (resolveStoryDelay === done) resolveStoryDelay = null;
      resolve();
    }
  });
}

function skipStartStory(event) {
  event.preventDefault();
  storySkipRequested = true;
  if (resolveStoryDelay) resolveStoryDelay();
}

async function playStartStory() {
  const panels = await Promise.race([
    getStartStoryPanels(),
    new Promise((resolve) => setTimeout(() => resolve([]), START_STORY_TIMEOUT)),
  ]);
  if (!panels.length) return;

  setupStartStoryPanels(panels);
  for (let index = 0; index < panels.length; index += 1) {
    if (storySkipRequested) break;
    revealStartStoryPanel(index);
    await delayStory(2000);
  }
  await delayStory(2000);
  hideStartStory();
}

async function startGame(event) {
  unlockAudio();
  event.preventDefault();
  if (state.gameState !== "start") return;

  storySkipRequested = false;
  state.gameState = "story";
  setStartLoading(true, {
    progress: state.preloadProgress,
    label: state.preloadReady ? "准备进入" : state.preloadLabel,
    blockStart: true,
  });
  await Promise.all([waitForPreload(), playStartStory()]);
  state.playerHp = balance.playerMaxHp;
  initLevel(0);
  hideStartScreen();
}

function handleSoundToggle(event) {
  event.preventDefault();
  const now = performance.now();
  if (event.type === "click" && now - lastSoundToggleAt < 250) return;
  lastSoundToggleAt = now;
  toggleSound();
  updateSoundToggle();
}

function restartCurrentLevel(event) {
  event.preventDefault();
  state.playerHp = balance.playerMaxHp;
  initLevel(state.levelIndex);
}

function handleReturnToStart(event) {
  event.preventDefault();
  returnToStartScreen();
}

export function bindInput() {
  window.addEventListener("keydown", (event) => {
    unlockAudio();
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "j"].includes(key)) {
      event.preventDefault();
    }
    if (key === "j" && state.gameState === "playing" && state.levelIndex === 0) {
      controls.speedBoost = true;
      elements.speedBtn.classList.add("active");
      return;
    }
    if (key === " " || key === "j") {
      attack();
      return;
    }
    keys.add(key);
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "j") {
      controls.speedBoost = false;
      elements.speedBtn.classList.remove("active");
    }
    keys.delete(key);
  });

  ["contextmenu", "selectstart", "dragstart"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => event.preventDefault());
  });

  document.querySelectorAll(".control-btn").forEach((button) => {
    const dir = button.dataset.dir;

    button.addEventListener("pointerdown", (event) => {
      unlockAudio();
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      touchDirs.add(dir);
    });

    button.addEventListener("pointerup", (event) => {
      event.preventDefault();
      touchDirs.delete(dir);
    });

    button.addEventListener("pointercancel", () => {
      touchDirs.delete(dir);
    });

    button.addEventListener("pointerleave", () => {
      touchDirs.delete(dir);
    });
  });

  elements.attackBtn.addEventListener("pointerdown", (event) => {
    unlockAudio();
    event.preventDefault();
    attack();
  });

  elements.speedBtn.addEventListener("pointerdown", (event) => {
    unlockAudio();
    event.preventDefault();
    controls.speedBoost = state.gameState === "playing" && state.levelIndex === 0;
    elements.speedBtn.classList.add("active");
    elements.speedBtn.setPointerCapture(event.pointerId);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    elements.speedBtn.addEventListener(eventName, (event) => {
      event.preventDefault();
      controls.speedBoost = false;
      elements.speedBtn.classList.remove("active");
    });
  });

  elements.soundToggleBtn.addEventListener("pointerdown", handleSoundToggle);
  elements.soundToggleBtn.addEventListener("click", handleSoundToggle);

  elements.startSoundBtn.addEventListener("pointerdown", handleSoundToggle);
  elements.startSoundBtn.addEventListener("click", handleSoundToggle);

  elements.homeToggleBtn.addEventListener("pointerdown", handleReturnToStart);
  elements.homeToggleBtn.addEventListener("click", handleReturnToStart);

  elements.startGameBtn.addEventListener("pointerdown", startGame);
  elements.startGameBtn.addEventListener("click", startGame);
  elements.startStorySkipBtn.addEventListener("pointerdown", skipStartStory);
  elements.startStorySkipBtn.addEventListener("click", skipStartStory);

  elements.restartLevelBtn.addEventListener("pointerdown", restartCurrentLevel);
  elements.restartLevelBtn.addEventListener("click", restartCurrentLevel);
  elements.restartGameBtn.addEventListener("pointerdown", handleReturnToStart);
  elements.restartGameBtn.addEventListener("click", handleReturnToStart);

  updateSoundToggle();
}
