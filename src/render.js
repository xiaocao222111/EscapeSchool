import { debug, images, WORLD } from "./config.js";
import { levels } from "./levels.js";
import { getFeetPoint, getLevelWorld, getSpriteRectFromFeet } from "./math.js";
import { state } from "./state.js";
import { canSeePlayer, getMatronVision } from "./systems.js";
import { ctx } from "./ui.js";

function drawRect(rect, color, label) {
  if (rect.hidden) return;

  if (rect.image && rect.image.complete && rect.image.naturalWidth > 0) {
    ctx.drawImage(rect.image, rect.x, rect.y, rect.w, rect.h);
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
  const flashing = player.invincible > 0 && Math.floor(player.invincible * 16) % 2 === 0;
  let labelY = player.y - 4;
  if (images.player.complete && images.player.naturalWidth > 0 && !flashing) {
    const spriteScale = 0.8;
    const spriteW = images.player.naturalWidth * spriteScale;
    const spriteH = images.player.naturalHeight * spriteScale;
    const sprite = getSpriteRectFromFeet(player, spriteW, spriteH);
    ctx.drawImage(images.player, sprite.x, sprite.y, sprite.w, sprite.h);
    labelY = sprite.y - 4;
  } else {
    const sprite = getSpriteRectFromFeet(player, player.w, player.h);
    ctx.fillStyle = flashing ? "#ffffff" : "#4cc9f0";
    ctx.fillRect(sprite.x, sprite.y, sprite.w, sprite.h);
    ctx.fillStyle = "#083344";
    ctx.fillRect(sprite.x + 7, sprite.y + 8, sprite.w - 14, 7);
    labelY = sprite.y - 4;
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("玩家", getFeetPoint(player).x, labelY);
}

function drawActorRect(entity, color, label) {
  const sprite = getSpriteRectFromFeet(entity, entity.w, entity.h);
  drawRect({ ...entity, ...sprite }, color, label);
}

function drawMatron(enemy) {
  const vision = getMatronVision(enemy);
  const startAngle = vision.angle - vision.halfAngle;
  const endAngle = vision.angle + vision.halfAngle;
  ctx.fillStyle = canSeePlayer(enemy) ? "rgba(255, 52, 52, 0.48)" : "rgba(255, 222, 89, 0.25)";
  ctx.beginPath();
  ctx.moveTo(vision.origin.x, vision.origin.y);
  ctx.arc(vision.origin.x, vision.origin.y, vision.range, startAngle, endAngle);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 239, 137, 0.75)";
  ctx.setLineDash([10, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  drawActorRect(enemy, "#d94679", "宿管");
}

function drawGuard(enemy) {
  const color = enemy.hitFlash > 0 ? "#ffffff" : "#f97316";
  const sprite = getSpriteRectFromFeet(enemy, enemy.w, enemy.h);
  drawRect({ ...enemy, ...sprite }, color, "保安");

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(sprite.x, sprite.y - 9, sprite.w, 5);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(sprite.x, sprite.y - 9, sprite.w * Math.max(0, enemy.hp) / enemy.maxHp, 5);
}

function drawAttackEffect() {
  if (!state.attackEffect) return;
  ctx.fillStyle = "rgba(255, 236, 128, 0.5)";
  ctx.fillRect(state.attackEffect.x, state.attackEffect.y, state.attackEffect.w, state.attackEffect.h);
  ctx.strokeStyle = "#fff3a3";
  ctx.lineWidth = 2;
  ctx.strokeRect(state.attackEffect.x, state.attackEffect.y, state.attackEffect.w, state.attackEffect.h);
}

function drawPlaceholderGate() {
  if (!levels[state.levelIndex].placeholder) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.fillRect(290, 72, 380, 76);
  ctx.fillStyle = "#fff8dc";
  ctx.font = "26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("第三关待开发", WORLD.width / 2, 110);
}

export function render() {
  const level = levels[state.levelIndex];
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawBackground(level);
  drawWalkAreaDebug(level);
  drawExit();
  for (const obstacle of state.obstacles) drawRect(obstacle, obstacle.color, obstacle.label);
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (enemy.type === "matron") drawMatron(enemy);
    if (enemy.type === "guard") drawGuard(enemy);
  }
  drawAttackEffect();
  drawPlayer();
  drawPlaceholderGate();
  ctx.restore();

  if (state.damageFlash > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${state.damageFlash * 1.5})`;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
}
