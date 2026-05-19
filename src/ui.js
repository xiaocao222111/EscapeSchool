import { audioState } from "./audio.js";
import { debug } from "./config.js";
import { levels } from "./levels.js";
import { state } from "./state.js";

export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");

export const elements = {
  levelName: document.getElementById("levelName"),
  levelProgress: document.getElementById("levelProgress"),
  statusText: document.getElementById("statusText"),
  playerStats: document.getElementById("playerStats"),
  overlay: document.getElementById("messageOverlay"),
  messageTitle: document.getElementById("messageTitle"),
  messageText: document.getElementById("messageText"),
  overlayActions: document.querySelector(".overlay-actions"),
  restartLevelBtn: document.getElementById("restartLevelBtn"),
  restartGameBtn: document.getElementById("restartGameBtn"),
  attackBtn: document.getElementById("attackBtn"),
  soundToggleBtn: document.getElementById("soundToggleBtn"),
  invincibleToggleBtn: document.getElementById("invincibleToggleBtn"),
};

export function hideOverlay() {
  elements.overlay.classList.add("hidden");
}

export function showOverlay(title, text, keepPlaying = false, showActions = true) {
  elements.messageTitle.textContent = title;
  elements.messageText.textContent = text;
  elements.overlayActions.style.display = showActions ? "flex" : "none";
  elements.overlay.classList.remove("hidden");
  if (!keepPlaying) state.gameState = title.includes("失败") ? "failed" : "paused";
}

export function updateHud() {
  const level = levels[state.levelIndex];
  elements.levelName.textContent = level.name;
  elements.levelProgress.textContent = `${state.levelIndex + 1}/3`;
  elements.statusText.textContent = level.objective;

  if (state.levelIndex === 1) {
    const guardCount = state.enemies.filter((enemy) => enemy.alive).length;
    elements.playerStats.textContent = `生命 ${Math.max(0, Math.ceil(state.player.hp))} | 保安 ${guardCount}`;
  } else {
    elements.playerStats.textContent = `生命 ${Math.max(0, Math.ceil(state.player.hp))}`;
  }
}

export function updateSoundToggle() {
  elements.soundToggleBtn.textContent = audioState.muted ? "声音 关" : "声音 开";
  elements.soundToggleBtn.setAttribute("aria-label", audioState.muted ? "打开声音" : "关闭声音");
  elements.soundToggleBtn.classList.toggle("is-muted", audioState.muted);
}

export function updateInvincibleToggle() {
  elements.invincibleToggleBtn.textContent = debug.invincible ? "无敌 开" : "无敌 关";
  elements.invincibleToggleBtn.setAttribute("aria-label", debug.invincible ? "关闭无敌" : "打开无敌");
  elements.invincibleToggleBtn.classList.toggle("is-enabled", debug.invincible);
}

export function toggleInvincible() {
  debug.invincible = !debug.invincible;
  updateInvincibleToggle();
}
