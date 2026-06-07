import { audioFiles } from "./config.js";

const sfxFiles = {
  caught: audioFiles.caught,
  attack: audioFiles.attack,
  playerFootstep: audioFiles.playerFootstep,
  npcFootstep: audioFiles.npcFootstep,
};

const sfxVolumes = {
  caught: 0.78,
  attack: 0.62,
  playerFootstep: 0.9,
  npcFootstep: 0.85,
};

export const audioState = {
  initialized: false,
  sfxInitialized: false,
  context: null,
  bgm: null,
  buffers: new Map(),
  bufferPromises: new Map(),
  fallbackSfx: new Map(),
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
  for (const [name, src] of Object.entries(sfxFiles)) {
    audioState.fallbackSfx.set(name, createAudio(src, sfxVolumes[name]));
  }
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

function getAudioContextCtor() {
  return window.AudioContext || window.webkitAudioContext;
}

function ensureAudioContext() {
  if (audioState.muted) return null;
  if (audioState.context) return audioState.context;

  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) return null;

  audioState.context = new AudioContextCtor();
  return audioState.context;
}

function preloadSfx() {
  const context = ensureAudioContext();
  if (!context || audioState.sfxInitialized) return;

  audioState.sfxInitialized = true;
  for (const name of Object.keys(sfxFiles)) {
    loadSfxBuffer(name);
  }
}

function loadSfxBuffer(name) {
  if (audioState.buffers.has(name)) return Promise.resolve(audioState.buffers.get(name));
  if (audioState.bufferPromises.has(name)) return audioState.bufferPromises.get(name);

  const context = ensureAudioContext();
  const src = sfxFiles[name];
  if (!context || !src) return Promise.resolve(null);

  const promise = fetch(src)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      audioState.buffers.set(name, buffer);
      return buffer;
    })
    .catch(() => null);

  audioState.bufferPromises.set(name, promise);
  return promise;
}

function restartFallbackSound(audio) {
  if (!audio || audioState.muted) return;
  audio.currentTime = 0;
  safePlay(audio);
}

export function unlockAudio() {
  if (audioState.muted) return;
  setupAudio();
  const context = ensureAudioContext();
  context?.resume?.().catch?.(() => {});
  preloadSfx();
  safePlay(audioState.bgm);
}

export function applyAudioMuteState() {
  if (!audioState.initialized) return;

  const sounds = [audioState.bgm, ...audioState.fallbackSfx.values()];
  for (const sound of sounds) {
    if (sound) sound.muted = audioState.muted;
  }

  if (audioState.muted && audioState.bgm) {
    audioState.bgm.pause();
  }

  if (audioState.context) {
    if (audioState.muted) {
      audioState.context.suspend?.().catch?.(() => {});
    } else {
      audioState.context.resume?.().catch?.(() => {});
    }
  }
}

export function toggleSound() {
  audioState.muted = !audioState.muted;
  setupAudio();
  applyAudioMuteState();
  if (!audioState.muted) {
    preloadSfx();
    safePlay(audioState.bgm);
  }
}

function playSfx(name) {
  setupAudio();
  if (audioState.muted) return;

  const context = ensureAudioContext();
  const buffer = audioState.buffers.get(name);
  if (!context || !buffer) {
    loadSfxBuffer(name);
    if (name === "playerFootstep" || name === "npcFootstep") return;
    restartFallbackSound(audioState.fallbackSfx.get(name));
    return;
  }

  context.resume?.().catch?.(() => {});
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = sfxVolumes[name] ?? 0.7;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(0);
}

export function playPlayerFootstepSound() {
  playSfx("playerFootstep");
}

export function playNpcFootstepSound() {
  playSfx("npcFootstep");
}

export function playAttackSound() {
  playSfx("attack");
}

export function playCaughtSound() {
  playSfx("caught");
}
