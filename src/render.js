import { balance, debug, images, WORLD } from "./config.js";
import { levels } from "./levels.js";
import { getFeetPoint, getLevelWorld, getSpriteRectFromFeet } from "./math.js";
import { state } from "./state.js";
import { drawCharacterSprite, getCharacterActionDuration, getCharacterSpriteSize } from "./spriteAnimator.js";
import { getDoormanState, isPlayerHiding } from "./systems.js";
import { ctx } from "./ui.js";
import { drawWalkMaskDebug } from "./walkMask.js";

function drawRect(rect, color, label) {
  if (rect.hidden) {
    if (debug.showWalkArea && state.levelIndex === 0) drawHiddenDebugRect(rect, label);
    return;
  }

  if (rect.image && rect.image.complete && rect.image.naturalWidth > 0) {
    const drawW = rect.drawW || rect.image.naturalWidth;
    const drawH = rect.drawH || rect.image.naturalHeight;
    const drawX = rect.x + rect.w / 2 - drawW / 2;
    const drawY = rect.y + rect.h - drawH;
    ctx.drawImage(rect.image, drawX, drawY, drawW, drawH);
    return;
  }

  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  if (label) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.font = "15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
}

function drawHiddenDebugRect(rect, label) {
  ctx.fillStyle = "rgba(59, 130, 246, 0.28)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = "rgba(147, 197, 253, 0.95)";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`${label || "hidden"} x:${Math.round(rect.x)} y:${Math.round(rect.y)}`, rect.x + 3, rect.y + 3);
  ctx.fillText(`w:${Math.round(rect.w)} h:${Math.round(rect.h)}`, rect.x + 3, rect.y + 16);
}

function drawBackground(level) {
  ctx.fillStyle = level.background;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  if (level.backgroundImage) {
    const image = level.backgroundImage;
    const world = getLevelWorld(level);
    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, 0, 0, world.width, world.height);
    }
    return;
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  const world = getLevelWorld(level);
  for (let x = 0; x <= world.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y <= world.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }
}

function drawWalkAreaDebug(level) {
  if (debug.showWalkArea) drawWalkMaskDebug(ctx, level);
  if (!debug.showWalkArea || !level.walkArea) return;

  const area = level.walkArea;
  ctx.fillStyle = "rgba(46, 204, 113, 0.22)";
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.strokeStyle = "rgba(46, 255, 143, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.strokeRect(area.x, area.y, area.w, area.h);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(220, 255, 230, 0.92)";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`walkArea x:${area.x} y:${area.y} w:${area.w} h:${area.h}`, area.x + 8, area.y + 8);
}

function drawExit() {
  const open = state.levelIndex !== 1 || state.enemies.every((enemy) => !enemy.alive);
  ctx.fillStyle = open ? "rgba(101, 221, 143, 0.78)" : "rgba(145, 145, 145, 0.65)";
  ctx.fillRect(state.exitZone.x, state.exitZone.y, state.exitZone.w, state.exitZone.h);
  ctx.strokeStyle = open ? "#d7ffe4" : "#d5d5d5";
  ctx.lineWidth = 3;
  ctx.strokeRect(state.exitZone.x, state.exitZone.y, state.exitZone.w, state.exitZone.h);
  ctx.fillStyle = "#102018";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(open ? state.exitZone.label : "未开启", state.exitZone.x + state.exitZone.w / 2, state.exitZone.y + state.exitZone.h / 2);
}

function drawPlayer() {
  const player = state.player;
  const hiding = isPlayerHiding();
  const attacking = state.playerAction === "attack" && state.playerActionTimer > 0;
  const action = hiding ? "hiddle" : attacking ? "attack" : player.invincible > 0 ? "hit" : player.isMoving ? "walk" : "idle";
  const elapsed = attacking ? state.playerActionElapsed : state.animationTime;
  const size = getCharacterSpriteSize("player");
  let spriteRect = getSpriteRectFromFeet(player, size.w, size.h);
  const drewSprite = drawCharacterSprite(ctx, "player", player, action, {
    elapsed,
    facing: player.facingX,
    hurt: action === "hit",
    loop: action === "idle" || action === "walk",
  });

  if (drewSprite) {
    spriteRect = drewSprite;
  } else {
    ctx.fillStyle = "#4cc9f0";
    ctx.fillRect(spriteRect.x, spriteRect.y, spriteRect.w, spriteRect.h);
  }

  drawPlayerHpBar(spriteRect);
}

function drawActorShadow(actor, role) {
  const size = getCharacterSpriteSize(role);
  const feet = getFeetPoint(actor);
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  const offsetX = role === "player" ? -3 : 0;
  const offsetY = role === "player" ? -5 : -8;
  const radiusX = role === "player" ? size.w * 0.18 : size.w * 0.26;
  const radiusY = role === "player" ? Math.max(4, size.h * 0.035) : Math.max(5, size.h * 0.045);
  ctx.ellipse(feet.x + offsetX, feet.y + offsetY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayerHpBar(sprite) {
  const barW = 42;
  const barH = 5;
  const x = sprite.x + sprite.w / 2 - barW / 2;
  const y = sprite.y - 7;
  const ratio = Math.max(0, Math.min(1, state.player.hp / balance.playerMaxHp));
  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = ratio > 0.35 ? "#22c55e" : "#facc15";
  ctx.fillRect(x, y, barW * ratio, barH);
}

function drawActorRect(entity, color, label) {
  const sprite = getSpriteRectFromFeet(entity, entity.w, entity.h);
  drawRect({ ...entity, ...sprite }, color, label);
}

function drawMatron(enemy) {
  if (!drawCharacterSprite(ctx, "matron", enemy, "walk", { elapsed: state.animationTime + enemy.animationOffset, loop: true })) {
    drawActorRect(enemy, "#d94679", "宿管");
  }
}

function drawDoorman(enemy) {
  const doormanState = getDoormanState(enemy);
  const color = doormanState.awake ? "#ef4444" : doormanState.warning ? "#f59e0b" : "#64748b";
  drawActorRect(enemy, color, "门卫");

  const feet = getFeetPoint(enemy);
  ctx.fillStyle = doormanState.awake ? "#ffe8e8" : "#f8fafc";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(doormanState.awake ? "醒了!" : doormanState.warning ? "快醒了" : "Zzz", feet.x, enemy.y - 4);
}

function drawGuard(enemy) {
  const color = enemy.hitFlash > 0 ? "#ffffff" : "#f97316";
  const guardSize = getCharacterSpriteSize("guard");
  let sprite = getSpriteRectFromFeet(enemy, guardSize.w, guardSize.h);
  const action = enemy.hitFlash > 0 ? "hit" : enemy.attackFlash > 0 ? "attack" : "walk";
  const elapsed = action === "hit"
    ? getCharacterActionDuration("guard", "hit") - enemy.hitFlash
    : action === "attack" ? 0.24 - enemy.attackFlash : state.animationTime + enemy.animationOffset;
  const drewSprite = drawCharacterSprite(ctx, "guard", enemy, action, {
    elapsed,
    hurt: action === "hit",
    loop: action === "walk",
  });
  if (drewSprite) {
    sprite = drewSprite;
  } else {
    drawRect({ ...enemy, ...sprite }, color, "保安");
  }

  const guardBarW = Math.min(56, sprite.w * 0.48);
  const guardBarX = sprite.x + sprite.w / 2 - guardBarW / 2;
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(guardBarX, sprite.y - 9, guardBarW, 5);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(guardBarX, sprite.y - 9, guardBarW * Math.max(0, enemy.hp) / enemy.maxHp, 5);
}

function drawAttackEffect() {
}

function drawActor(actor) {
  if (actor === state.player) {
    drawActorShadow(actor, "player");
    drawPlayer();
    return;
  }
  if (actor.type === "matron") {
    drawActorShadow(actor, "matron");
    drawMatron(actor);
  }
  if (actor.type === "guard") {
    drawActorShadow(actor, "guard");
    drawGuard(actor);
  }
  if (actor.type === "doorman") drawDoorman(actor);
}

export function render() {
  const level = levels[state.levelIndex];
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawBackground(level);
  drawWalkAreaDebug(level);
  drawExit();
  drawAttackEffect();
  const actors = [state.player, ...state.enemies.filter((enemy) => enemy.alive)]
    .sort((a, b) => getFeetPoint(a).y - getFeetPoint(b).y);
  for (const actor of actors) drawActor(actor);
  for (const obstacle of state.obstacles) drawRect(obstacle, obstacle.color, obstacle.label);
  ctx.restore();
}
