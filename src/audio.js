import { audioFiles } from "./config.js";

export const audioState = {
  initialized: false,
  bgm: null,
  caught: null,
  footsteps: [],
  footstepIndex: 0,
  muted: false,
};

function createAudio(src, volume, loop = false) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = volume;
  audio.loop = loop;
  return audio;
}

export function setupAudio() {
  if (audioState.initialized) return;

  audioState.bgm = createAudio(audioFiles.bgm, 0.42, true);
  audioState.caught = createAudio(audioFiles.caught, 0.78);
  audioState.footsteps = audioFiles.footsteps.map((src) => createAudio(src, 0.5));
  audioState.initialized = true;
  applyAudioMuteState();
}

export function safePlay(audio) {
  if (!audio || audioState.muted) return;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function restartSound(audio) {
  if (!audio || audioState.muted) return;
  audio.currentTime = 0;
  safePlay(audio);
}

export function unlockAudio() {
  if (audioState.muted) return;
  setupAudio();
  safePlay(audioState.bgm);
}

export function applyAudioMuteState() {
  if (!audioState.initialized) return;

  const sounds = [audioState.bgm, audioState.caught, ...audioState.footsteps];
  for (const sound of sounds) {
    if (sound) sound.muted = audioState.muted;
  }

  if (audioState.muted && audioState.bgm) {
    audioState.bgm.pause();
  }
}

export function toggleSound() {
  audioState.muted = !audioState.muted;
  setupAudio();
  applyAudioMuteState();
  if (!audioState.muted) safePlay(audioState.bgm);
}

export function playFootstepSound() {
  setupAudio();
  const sound = audioState.footsteps[audioState.footstepIndex % audioState.footsteps.length];
  audioState.footstepIndex += 1;
  restartSound(sound);
}

export function playCaughtSound() {
  setupAudio();
  restartSound(audioState.caught);
}
