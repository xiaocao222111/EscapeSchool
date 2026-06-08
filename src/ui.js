import { audioState } from "./audio.js?v=20260607-audio-buffer-1";
import { balance } from "./config.js";
import { levels } from "./levels.js";
import { state } from "./state.js";
import { applyGameUiAtlas, setGameSoundFrame, setStartSoundFrame } from "./uiAtlas.js?v=20260608-keyboard-boost-1";

export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");

export const elements = {
  gameStage: document.getElementById("gameStage"),
  startScreen: document.getElementById("startScreen"),
  startTitleImg: document.getElementById("startTitleImg"),
  startGameBtn: document.getElementById("startGameBtn"),
  startGameImg: document.getElementById("startGameImg"),
  startSoundBtn: document.getElementById("startSoundBtn"),
  startSoundImg: document.getElementById("startSoundImg"),
  startLoading: document.getElementById("startLoading"),
  startLoadingText: document.getElementById("startLoadingText"),
  startLoadingPercent: document.getElementById("startLoadingPercent"),
  startProgress: document.querySelector(".start-progress"),
  startProgressFill: document.getElementById("startProgressFill"),
  startStory: document.getElementById("startStory"),
  startStorySkipBtn: document.getElementById("startStorySkipBtn"),
  startStoryBoard: document.getElementById("startStoryBoard"),
  levelName: document.getElementById("levelName"),
  levelProgress: document.getElementById("levelProgress"),
  statusText: document.getElementById("statusText"),
  playerStats: document.getElementById("playerStats"),
  overlay: document.getElementById("messageOverlay"),
  failurePanel: document.querySelector(".failure-panel"),
  failureCharacter: document.querySelector(".failure-character"),
  messageTitle: document.getElementById("messageTitle"),
  messageText: document.getElementById("messageText"),
  overlayActions: document.querySelector(".overlay-actions"),
  restartLevelBtn: document.getElementById("restartLevelBtn"),
  restartGameBtn: document.getElementById("restartGameBtn"),
  speedBtn: document.getElementById("speedBtn"),
  attackBtn: document.getElementById("attackBtn"),
  dpad: document.querySelector(".dpad"),
  soundToggleBtn: document.getElementById("soundToggleBtn"),
  homeToggleBtn: document.getElementById("homeToggleBtn"),
};

const startStoryLayout = [
  { left: 0, top: 0, width: 42.8, height: 56.2, z: 1 },
  { left: 39.6, top: 0, width: 34.4, height: 59.2, z: 2 },
  { left: 68.4, top: 0, width: 31.6, height: 59.6, z: 3 },
  { left: 0, top: 49.2, width: 100, height: 50.8, z: 4 },
];

export function hideOverlay() {
  elements.overlay.classList.add("hidden");
  elements.overlay.classList.remove("is-failure", "is-success");
}

export function showStartScreen() {
  elements.startScreen.classList.remove("hidden");
  elements.gameStage.classList.add("is-start-screen");
  hideStartStory();
  setStartLoading(!state.preloadReady, {
    progress: state.preloadProgress,
    label: state.preloadReady ? "加载完成" : state.preloadLabel,
  });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.gameState = "start";
}

export function hideStartScreen() {
  elements.startScreen.classList.add("hidden");
  elements.gameStage.classList.remove("is-start-screen");
  setStartLoading(false);
  applyGameUiAtlas(elements).then(() => {
    setGameSoundFrame(elements, audioState.muted);
  });
}

export function setStartLoading(isLoading, options = {}) {
  const progress = Math.max(0, Math.min(1, options.progress ?? state.preloadProgress ?? 0));
  const percent = Math.round(progress * 100);
  const label = options.label || state.preloadLabel || "资源加载中";

  state.preloadProgress = progress;
  state.preloadLabel = label;

  elements.startLoading.classList.toggle("hidden", !isLoading);
  elements.startGameBtn.disabled = isLoading;
  elements.startGameBtn.setAttribute("aria-busy", isLoading ? "true" : "false");
  elements.startLoadingText.textContent = label;
  elements.startLoadingPercent.textContent = `${percent}%`;
  elements.startProgress.setAttribute("aria-valuenow", String(percent));
  elements.startProgressFill.style.transform = `scaleX(${progress})`;
}

export function setupStartStoryPanels(panels) {
  elements.startScreen.classList.add("is-story-playing");
  elements.startStory.classList.remove("hidden");
  elements.startStory.setAttribute("aria-hidden", "false");
  elements.startStoryBoard.innerHTML = "";

  elements.startStoryBoard.style.aspectRatio = "1823 / 1039";

  for (const [index, panel] of panels.entries()) {
    const layout = startStoryLayout[index] || startStoryLayout[startStoryLayout.length - 1];
    const img = document.createElement("img");
    img.src = panel.url;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.dataset.storyPanel = panel.name;
    img.style.left = `${layout.left}%`;
    img.style.top = `${layout.top}%`;
    img.style.width = `${layout.width}%`;
    img.style.height = `${layout.height}%`;
    img.style.zIndex = layout.z;
    elements.startStoryBoard.appendChild(img);
  }
}

export function revealStartStoryPanel(index) {
  const panel = elements.startStoryBoard.children[index];
  if (!panel) return;
  requestAnimationFrame(() => {
    panel.classList.add("is-visible");
  });
}

export function hideStartStory() {
  elements.startScreen.classList.remove("is-story-playing");
  elements.startStory.classList.add("hidden");
  elements.startStory.setAttribute("aria-hidden", "true");
  elements.startStoryBoard.innerHTML = "";
}

export function showOverlay(title, text, keepPlaying = false, showActions = true) {
  const isFailure = title.includes("抓住") || title.includes("失败");
  const isSuccess = title.includes("成功");
  elements.messageTitle.textContent = title;
  elements.messageText.textContent = text;
  elements.overlayActions.style.display = showActions ? "flex" : "none";
  elements.overlay.classList.toggle("is-failure", isFailure);
  elements.overlay.classList.toggle("is-success", isSuccess);
  elements.restartLevelBtn.hidden = isSuccess;
  elements.restartGameBtn.hidden = false;
  elements.overlay.classList.remove("hidden");
  if (!keepPlaying) state.gameState = isFailure ? "failed" : "paused";
}

export function updateHud() {
  const level = levels[state.levelIndex];
  elements.levelName.textContent = level.name;
  elements.levelProgress.textContent = `${state.levelIndex + 1}/${levels.length}`;
  elements.statusText.textContent = state.statusText || level.objective;
  const canBoost = state.levelIndex === 0;
  const canAttack = state.levelIndex === 1;
  elements.speedBtn.classList.toggle("is-hidden", !canBoost);
  elements.speedBtn.style.display = canBoost ? "" : "none";
  elements.speedBtn.setAttribute("aria-hidden", canBoost ? "false" : "true");
  elements.attackBtn.classList.toggle("is-hidden", !canAttack);
  elements.attackBtn.style.display = canAttack ? "" : "none";
  elements.attackBtn.setAttribute("aria-hidden", canAttack ? "false" : "true");

  if (state.levelIndex === 1) {
    const guardCount = state.enemies.filter((enemy) => enemy.alive).length;
    elements.playerStats.textContent = `生命 ${Math.max(0, Math.ceil(state.player.hp))}/${balance.playerMaxHp} | 保安 ${guardCount}`;
  } else {
    elements.playerStats.textContent = `生命 ${Math.max(0, Math.ceil(state.player.hp))}/${balance.playerMaxHp}`;
  }
}

export function updateSoundToggle() {
  elements.soundToggleBtn.textContent = audioState.muted ? "声音 关" : "声音 开";
  elements.soundToggleBtn.setAttribute("aria-label", audioState.muted ? "打开声音" : "关闭声音");
  elements.soundToggleBtn.classList.toggle("is-muted", audioState.muted);
  setGameSoundFrame(elements, audioState.muted);
  applyGameUiAtlas(elements).then(() => {
    setGameSoundFrame(elements, audioState.muted);
  });
  elements.startSoundBtn.setAttribute("aria-label", audioState.muted ? "打开声音" : "关闭声音");
  elements.startSoundBtn.classList.toggle("is-muted", audioState.muted);
  setStartSoundFrame(elements, audioState.muted);
}
