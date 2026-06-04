import { characterAtlases, WORLD } from "./config.js";
import { levels } from "./levels.js";
import { state } from "./state.js";

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function centerOf(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function cloneRect(rect) {
  return { ...rect };
}

export function getLevelWorld(level = levels[state.levelIndex]) {
  return level.world || WORLD;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function rectInside(inner, outer) {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

export function getFootBox(entity) {
  const w = entity.w * 0.7;
  const h = entity.h * 0.25;
  return {
    x: entity.x + (entity.w - w) / 2,
    y: entity.y + entity.h - h,
    w,
    h,
  };
}

export function getActorBlockBox(entity, visualSource = entity) {
  const feet = getFeetPoint(entity);
  let spriteW = entity.w;
  let spriteH = entity.h;

  if (visualSource === state.player) {
    spriteW = characterAtlases.player.defaultSize.w;
    spriteH = characterAtlases.player.defaultSize.h;
  }

  const w = Math.max(entity.w * 0.9, Math.min(spriteW * 0.58, 52));
  const h = Math.max(entity.h * 0.42, Math.min(spriteH * 0.34, 42));
  return {
    x: feet.x - w / 2,
    y: feet.y - h,
    w,
    h,
  };
}

export function getFeetPoint(entity) {
  const footBox = getFootBox(entity);
  return {
    x: footBox.x + footBox.w / 2,
    y: footBox.y + footBox.h,
  };
}

export function getSpriteRectFromFeet(entity, width, height) {
  const feet = getFeetPoint(entity);
  return {
    x: feet.x - width / 2,
    y: feet.y - height,
    w: width,
    h: height,
  };
}

export function getSightPoint(entity) {
  return {
    x: entity.x + entity.w / 2,
    y: entity.y + entity.h * 0.35,
  };
}

export function getPlayerSightPoint() {
  const player = state.player;
  const spriteW = characterAtlases.player.defaultSize.w;
  const spriteH = characterAtlases.player.defaultSize.h;
  const sprite = getSpriteRectFromFeet(player, spriteW, spriteH);
  return {
    x: sprite.x + sprite.w / 2,
    y: sprite.y + sprite.h * 0.48,
  };
}
