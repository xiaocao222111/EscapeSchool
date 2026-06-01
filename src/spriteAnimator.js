import { playerSpriteAtlas } from "./config.js";
import { getSpriteRectFromFeet } from "./math.js";

const atlasCache = {
  status: "idle",
  actions: {},
};

function loadAtlas() {
  if (atlasCache.status !== "idle") return;
  atlasCache.status = "loading";

  fetch(playerSpriteAtlas.json)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${playerSpriteAtlas.json}`);
      return response.json();
    })
    .then((data) => {
      atlasCache.actions = groupFrames(data.frames || []);
      atlasCache.status = "ready";
    })
    .catch(() => {
      atlasCache.status = "failed";
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

export function getPlayerSpriteSize() {
  return playerSpriteAtlas.defaultSize;
}

export function getPlayerActionDuration(action) {
  loadAtlas();
  const frames = atlasCache.actions[action];
  const frameCount = frames?.length || (action === "attack" ? 9 : 1);
  return frameCount * playerSpriteAtlas.frameDuration;
}

export function drawPlayerSprite(ctx, player, action, options = {}) {
  loadAtlas();
  const image = playerSpriteAtlas.image;
  if (atlasCache.status !== "ready" || !image.complete || image.naturalWidth <= 0) return null;

  const frames = atlasCache.actions[action] || atlasCache.actions.idle;
  if (!frames?.length) return null;

  const elapsed = options.elapsed || 0;
  const rawIndex = Math.floor(elapsed / playerSpriteAtlas.frameDuration);
  const frameIndex = options.loop === false ? Math.min(rawIndex, frames.length - 1) : rawIndex % frames.length;
  const frame = frames[frameIndex];
  const source = frame.frame;
  const sourceSize = frame.sourceSize || playerSpriteAtlas.defaultSize;
  const sprite = getSpriteRectFromFeet(player, sourceSize.w, sourceSize.h);
  const facing = options.facing || player.facingX || "right";
  const shouldFlip = facing !== playerSpriteAtlas.naturalFacing;

  ctx.save();
  if (shouldFlip) {
    ctx.translate(sprite.x + sprite.w, sprite.y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, source.x, source.y, source.w, source.h, 0, 0, sprite.w, sprite.h);
    if (options.hurt) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(0, 0, sprite.w, sprite.h);
    }
  } else {
    ctx.drawImage(image, source.x, source.y, source.w, source.h, sprite.x, sprite.y, sprite.w, sprite.h);
    if (options.hurt) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(sprite.x, sprite.y, sprite.w, sprite.h);
    }
  }
  ctx.restore();

  return sprite;
}
