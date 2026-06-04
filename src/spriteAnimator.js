import { characterAtlases } from "./config.js";
import { getSpriteRectFromFeet } from "./math.js";

const atlasCaches = new Map();
const tintCanvas = document.createElement("canvas");
const tintCtx = tintCanvas.getContext("2d");

function getCache(role) {
  if (!atlasCaches.has(role)) {
    atlasCaches.set(role, { status: "idle", actions: {} });
  }
  return atlasCaches.get(role);
}

function loadAtlas(role) {
  const spec = characterAtlases[role];
  const cache = getCache(role);
  if (!spec || cache.status !== "idle") return;
  cache.status = "loading";

  fetch(spec.json)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${spec.json}`);
      return response.json();
    })
    .then((data) => {
      cache.actions = groupFrames(data.frames || []);
      cache.status = "ready";
    })
    .catch(() => {
      cache.status = "failed";
    });
}

function groupFrames(frames) {
  const actions = {};

  for (const item of frames) {
    const filename = item.filename || "";
    const name = filename.replace(/\.[^.]+$/, "");
    const action = name.includes("_") ? name.split("_")[0] : name;
    if (!actions[action]) actions[action] = [];
    actions[action].push(item);
  }

  for (const action of Object.keys(actions)) {
    actions[action].sort((a, b) => frameNumber(a.filename) - frameNumber(b.filename));
  }

  return actions;
}

function frameNumber(filename) {
  const match = filename.match(/_(\d+)\.[^.]+$/);
  return match ? Number(match[1]) : 0;
}

function getFrameDuration(role, action) {
  const durations = characterAtlases[role]?.frameDurations;
  return durations?.[action] || durations?.default || 2 / 60;
}

export function getCharacterSpriteSize(role) {
  return characterAtlases[role]?.defaultSize || { w: 34, h: 42 };
}

export function getCharacterActionDuration(role, action) {
  loadAtlas(role);
  const frames = getCache(role).actions[action];
  const frameCount = frames?.length || characterAtlases[role]?.frameCounts?.[action] || 1;
  return frameCount * getFrameDuration(role, action);
}

export function drawCharacterSprite(ctx, role, entity, action, options = {}) {
  const spec = characterAtlases[role];
  if (!spec) return null;

  loadAtlas(role);
  const cache = getCache(role);
  const image = spec.image;
  if (cache.status !== "ready" || !image.complete || image.naturalWidth <= 0) return null;

  const frames = cache.actions[action] || cache.actions.walk || cache.actions.idle;
  if (!frames?.length) return null;

  const elapsed = options.elapsed || 0;
  const rawIndex = Math.floor(elapsed / getFrameDuration(role, action));
  const frameIndex = options.loop === false ? Math.min(rawIndex, frames.length - 1) : rawIndex % frames.length;
  const frame = frames[frameIndex];
  const source = frame.frame;
  const sourceSize = frame.sourceSize || spec.defaultSize;
  const sprite = getSpriteRectFromFeet(entity, sourceSize.w, sourceSize.h);
  const facing = options.facing || entity.facingX || (entity.dir >= 0 ? "right" : "left");
  const shouldFlip = facing !== spec.naturalFacing;

  ctx.save();
  if (shouldFlip) {
    ctx.translate(sprite.x + sprite.w, sprite.y);
    ctx.scale(-1, 1);
    drawFrame(ctx, image, source, 0, 0, sprite.w, sprite.h, options.hurt);
  } else {
    drawFrame(ctx, image, source, sprite.x, sprite.y, sprite.w, sprite.h, options.hurt);
  }
  ctx.restore();

  return sprite;
}

function drawFrame(ctx, image, source, x, y, w, h, hurt) {
  if (!hurt) {
    ctx.drawImage(image, source.x, source.y, source.w, source.h, x, y, w, h);
    return;
  }

  tintCanvas.width = w;
  tintCanvas.height = h;
  tintCtx.clearRect(0, 0, w, h);
  tintCtx.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, w, h);
  tintCtx.globalCompositeOperation = "source-atop";
  tintCtx.fillStyle = "rgba(255, 0, 0, 0.3)";
  tintCtx.fillRect(0, 0, w, h);
  tintCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(tintCanvas, x, y);
}
