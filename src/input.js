import { toggleSound, unlockAudio } from "./audio.js";
import { keys, state, touchDirs } from "./state.js";
import { attack, initLevel, restartGame } from "./systems.js";
import {
  elements,
  toggleInvincible,
  updateInvincibleToggle,
  updateSoundToggle,
} from "./ui.js";

export function bindInput() {
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

  elements.invincibleToggleBtn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    toggleInvincible();
  });

  elements.restartLevelBtn.addEventListener("click", () => initLevel(state.levelIndex));
  elements.restartGameBtn.addEventListener("click", restartGame);

  updateSoundToggle();
  updateInvincibleToggle();
}
