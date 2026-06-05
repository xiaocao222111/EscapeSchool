import { toggleSound, unlockAudio } from "./audio.js";
import { balance } from "./config.js";
import { keys, state, touchDirs } from "./state.js";
import { attack, initLevel, restartGame, returnToStartScreen } from "./systems.js";
import {
  elements,
  hideStartScreen,
  setupLevelSelect,
  toggleInvincible,
  updateInvincibleToggle,
  updateSoundToggle,
} from "./ui.js";

export function bindInput() {
  setupLevelSelect();

  window.addEventListener("keydown", (event) => {
    unlockAudio();
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "j"].includes(key)) {
      event.preventDefault();
    }
    if (key === " " || key === "j") {
      attack();
      return;
    }
    keys.add(key);
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
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

  elements.soundToggleBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    toggleSound();
    updateSoundToggle();
  });

  elements.startSoundBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    toggleSound();
    updateSoundToggle();
  });

  elements.invincibleToggleBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    toggleInvincible();
  });

  elements.homeToggleBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    returnToStartScreen();
  });

  elements.startGameBtn.addEventListener("pointerdown", (event) => {
    unlockAudio();
    event.preventDefault();
    state.playerHp = balance.playerMaxHp;
    initLevel(0);
    hideStartScreen();
  });

  elements.levelSelect.addEventListener("change", () => {
    const index = Number(elements.levelSelect.value);
    if (!Number.isInteger(index)) return;
    state.playerHp = balance.playerMaxHp;
    initLevel(index);
  });

  elements.restartLevelBtn.addEventListener("click", () => initLevel(state.levelIndex));
  elements.restartGameBtn.addEventListener("click", restartGame);

  updateSoundToggle();
  updateInvincibleToggle();
}
