import { playCaughtSound, playFootstepSound } from "./audio.js";
import { activeLevelCount, balance, debug, failureResults, WORLD } from "./config.js";
import { levels } from "./levels.js";
import {
  centerOf,
  clamp,
  cloneRect,
  getActorBlockBox,
  getFootBox,
  getLevelWorld,
  getPlayerSightPoint,
  getSightPoint,
  rectInside,
  rectsOverlap,
} from "./math.js";
import { keys, state, touchDirs } from "./state.js";
import { getCharacterActionDuration } from "./spriteAnimator.js";
import { elements, hideOverlay, showOverlay, updateHud } from "./ui.js";
import { canFootBoxUseMask } from "./walkMask.js";

export function updateCamera() {
  const world = getLevelWorld();
  state.camera.x = clamp(state.player.x + state.player.w / 2 - WORLD.width / 2, 0, Math.max(0, world.width - WORLD.width));
  state.camera.y = clamp(state.player.y + state.player.h / 2 - WORLD.height / 2, 0, Math.max(0, world.height - WORLD.height));
}

export function initLevel(index) {
  clearFailureRestartTimer();
  const level = levels[index];
  if (index === 0) state.playerHp = balance.playerMaxHp;
  state.levelIndex = index;
  state.gameState = "playing";
  state.obstacles = level.obstacles.map(cloneRect);
  state.exitZone = cloneRect(level.exit);
  state.enemies = level.enemies.map((enemy) => ({
    ...enemy,
    maxHp: enemy.hp || 1,
    alive: true,
    hitFlash: 0,
    animationOffset: Math.random() * 10,
    homeX: enemy.x,
    homeY: enemy.y,
    patrolDir: enemy.dir || 1,
    sleepTimer: enemy.sleepOffset || 0,
    mode: "patrol",
  }));
  state.player = {
    x: level.spawn.x,
    y: level.spawn.y,
    w: 30,
    h: 38,
    speed: balance.playerSpeed,
    hp: state.playerHp,
    facing: "right",
    facingX: "right",
    attackCooldown: 0,
    invincible: 0,
  };
  state.camera = { x: 0, y: 0 };
  state.footstepTimer = 0;
  state.playerAction = null;
  state.playerActionTimer = 0;
  state.playerActionElapsed = 0;
  updateCamera();
  state.attackEffect = null;
  hideOverlay();
  updateHud();

}

export function restartGame() {
  state.playerHp = balance.playerMaxHp;
  initLevel(0);
}

function clearFailureRestartTimer() {
  if (!state.failureRestartTimer) return;
  clearTimeout(state.failureRestartTimer);
  state.failureRestartTimer = null;
}

function getInputVector() {
  let x = 0;
  let y = 0;
  if (keys.has("arrowleft") || keys.has("a") || touchDirs.has("left")) x -= 1;
  if (keys.has("arrowright") || keys.has("d") || touchDirs.has("right")) x += 1;
  if (keys.has("arrowup") || keys.has("w") || touchDirs.has("up")) y -= 1;
  if (keys.has("arrowdown") || keys.has("s") || touchDirs.has("down")) y += 1;

  if (x !== 0 || y !== 0) {
    const length = Math.hypot(x, y);
    x /= length;
    y /= length;
    if (Math.abs(x) > Math.abs(y)) {
      state.player.facing = x > 0 ? "right" : "left";
      state.player.facingX = state.player.facing;
    } else {
      state.player.facing = y > 0 ? "down" : "up";
      if (x !== 0) state.player.facingX = x > 0 ? "right" : "left";
    }
  }

  return { x, y };
}

function canOccupy(rect, ignoreEnemy = null) {
  const level = levels[state.levelIndex];
  const world = getLevelWorld();
  const footBox = getFootBox(rect);
  const sideMargin = level.walkMask ? 0 : 12;
  const topMargin = level.walkMask ? 0 : 52;
  const bottomMargin = level.walkMask ? 0 : 12;
  if (
    footBox.x < sideMargin
    || footBox.y < topMargin
    || footBox.x + footBox.w > world.width - sideMargin
    || footBox.y + footBox.h > world.height - bottomMargin
  ) {
    return false;
  }

  if (level.walkArea && !rectInside(footBox, level.walkArea)) return false;
  if (!canFootBoxUseMask(footBox, level)) return false;

  if (state.obstacles.some((obstacle) => !obstacle.hidden && rectsOverlap(footBox, obstacle))) return false;

  const actorBox = getActorBlockBox(rect, ignoreEnemy ? rect : state.player);
  if (ignoreEnemy && state.player && rectsOverlap(actorBox, getActorBlockBox(state.player))) return false;
  return !state.enemies.some((enemy) => (
    enemy !== ignoreEnemy
    && enemy.alive
    && rectsOverlap(actorBox, getActorBlockBox(enemy))
  ));
}

function moveEntity(entity, dx, dy, ignoreEnemy = null) {
  let movedX = false;
  let movedY = false;

  if (dx !== 0) {
    const nextX = { ...entity, x: entity.x + dx };
    if (canOccupy(nextX, ignoreEnemy)) {
      entity.x = nextX.x;
      movedX = true;
    }
  }

  if (dy !== 0) {
    const nextY = { ...entity, y: entity.y + dy };
    if (canOccupy(nextY, ignoreEnemy)) {
      entity.y = nextY.y;
      movedY = true;
    }
  }

  return { movedX, movedY };
}

function movePlayer(dt) {
  let input = getInputVector();
  if (state.player.invincible > 0) {
    input = { x: 0, y: 0 };
  }
  const hidingObstacle = getPlayerHidingObstacle();
  if (hidingObstacle && (input.x !== 0 || input.y !== 0)) {
    const playerFoot = centerOf(getFootBox(state.player));
    const obstacleCenter = centerOf(hidingObstacle);
    const awayX = playerFoot.x - obstacleCenter.x;
    const awayY = playerFoot.y - obstacleCenter.y;
    if (input.x * awayX + input.y * awayY <= 0) {
      input = { x: 0, y: 0 };
    }
  }
  const movement = moveEntity(state.player, input.x * state.player.speed * dt, input.y * state.player.speed * dt);
  const isMoving = movement.movedX || movement.movedY;
  state.player.isMoving = isMoving;

  if (state.levelIndex === 0 && isMoving) {
    state.footstepTimer -= dt;
    if (state.footstepTimer <= 0) {
      playFootstepSound();
      state.footstepTimer = 0.28;
    }
  } else {
    state.footstepTimer = 0;
  }
}

function updateMatron(enemy, dt) {
  const dx = enemy.dir * enemy.speed * dt;
  const next = { ...enemy, x: enemy.x + dx };
  if (next.x < enemy.minX || next.x > enemy.maxX || !canOccupy(next, enemy)) {
    enemy.dir *= -1;
    return;
  }
  enemy.x = next.x;
}

export function getMatronVision(enemy) {
  const halfAngle = enemy.visionAngle || Math.atan((enemy.visionH || 92) / 2 / enemy.visionW);
  return {
    origin: getSightPoint(enemy),
    angle: enemy.dir >= 0 ? 0 : Math.PI,
    range: enemy.visionW,
    halfAngle,
  };
}

export function isPlayerHiding() {
  return Boolean(getPlayerHidingObstacle());
}

function getPlayerHidingObstacle() {
  if (state.levelIndex !== 0 || !state.player) return null;
  const footBox = getFootBox(state.player);
  return state.obstacles.find((obstacle) => {
    if (!obstacle.hidden) return false;
    const proximity = {
      x: obstacle.x - 12,
      y: obstacle.y - 12,
      w: obstacle.w + 24,
      h: obstacle.h + 24,
    };
    return rectsOverlap(footBox, proximity);
  });
}

export function getDoormanState(enemy) {
  const sleepDuration = enemy.sleepDuration || 3.2;
  const awakeDuration = enemy.awakeDuration || 2.4;
  const cycle = sleepDuration + awakeDuration;
  const time = (enemy.sleepTimer || 0) % cycle;
  const sleeping = time < sleepDuration;
  const warning = sleeping && sleepDuration - time <= (enemy.wakeWarning || 0.7);

  return {
    sleeping,
    warning,
    awake: !sleeping,
    time,
  };
}

function lineIntersectsRect(a, b, rect) {
  const pointInside = (point) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  if (pointInside(a) || pointInside(b)) return true;

  const edges = [
    [{ x: rect.x, y: rect.y }, { x: rect.x + rect.w, y: rect.y }],
    [{ x: rect.x + rect.w, y: rect.y }, { x: rect.x + rect.w, y: rect.y + rect.h }],
    [{ x: rect.x + rect.w, y: rect.y + rect.h }, { x: rect.x, y: rect.y + rect.h }],
    [{ x: rect.x, y: rect.y + rect.h }, { x: rect.x, y: rect.y }],
  ];

  return edges.some(([c, d]) => segmentsIntersect(a, b, c, d));
}

function segmentsIntersect(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const between = (p, q, r) => (
    Math.min(p.x, r.x) <= q.x && q.x <= Math.max(p.x, r.x)
    && Math.min(p.y, r.y) <= q.y && q.y <= Math.max(p.y, r.y)
  );
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  const epsilon = 0.0001;

  if (Math.abs(abC) < epsilon && between(a, c, b)) return true;
  if (Math.abs(abD) < epsilon && between(a, d, b)) return true;
  if (Math.abs(cdA) < epsilon && between(c, a, d)) return true;
  if (Math.abs(cdB) < epsilon && between(c, b, d)) return true;

  return abC * abD < 0 && cdA * cdB < 0;
}

export function canSeePlayer(enemy) {
  const vision = getMatronVision(enemy);
  const playerSightPoint = getPlayerSightPoint();
  const dx = playerSightPoint.x - vision.origin.x;
  const dy = playerSightPoint.y - vision.origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance > vision.range) return false;

  const angleToPlayer = Math.atan2(dy, dx);
  const angleDiff = Math.abs(Math.atan2(Math.sin(angleToPlayer - vision.angle), Math.cos(angleToPlayer - vision.angle)));
  if (angleDiff > vision.halfAngle) return false;

  return !state.obstacles.some((obstacle) => lineIntersectsRect(vision.origin, playerSightPoint, obstacle));
}

function patrolGuard(guard, dt) {
  const dx = guard.patrolDir * guard.speed * dt;
  const nextX = guard.x + dx;
  const next = { ...guard, x: nextX };

  if (nextX >= guard.minX && nextX <= guard.maxX && canOccupy(next, guard)) {
    guard.x = nextX;
    guard.dir = guard.patrolDir;
    return;
  }

  guard.patrolDir *= -1;
  guard.dir = guard.patrolDir;

  const retryX = guard.x + guard.patrolDir * guard.speed * dt;
  const retry = { ...guard, x: retryX };
  if (retryX >= guard.minX && retryX <= guard.maxX && canOccupy(retry, guard)) {
    guard.x = retryX;
  }
}

function moveGuardToward(guard, target, dt) {
  const guardCenter = centerOf(guard);
  const dx = target.x - guardCenter.x;
  const dy = target.y - guardCenter.y;
  const dist = Math.hypot(dx, dy) || 1;
  const stepX = (dx / dist) * guard.speed * dt;
  const stepY = (dy / dist) * guard.speed * dt;
  const movement = moveEntity(guard, stepX, stepY, guard);

  if (Math.abs(dx) > 1) guard.dir = dx > 0 ? 1 : -1;

  if (!movement.movedX && !movement.movedY) {
    patrolGuard(guard, dt);
  }

  return dist;
}

function updateGuards(dt) {
  const playerCenter = centerOf(state.player);
  const playerIsAttacking = isPlayerAttacking();

  for (const guard of state.enemies) {
    if (!guard.alive) continue;

    guard.cooldown = Math.max(0, guard.cooldown - dt);
    guard.hitFlash = Math.max(0, guard.hitFlash - dt);
    guard.attackFlash = Math.max(0, (guard.attackFlash || 0) - dt);

    const guardCenter = centerOf(guard);
    const dx = playerCenter.x - guardCenter.x;
    const dy = playerCenter.y - guardCenter.y;
    const dist = Math.hypot(dx, dy) || 1;
    const loseRange = guard.detectRange * 1.35;

    if (dist <= guard.detectRange) {
      guard.mode = "chase";
    } else if (guard.mode === "chase" && dist > loseRange) {
      guard.mode = "return";
    }

    if (guard.mode === "chase") {
      moveGuardToward(guard, playerCenter, dt);
    } else if (guard.mode === "return") {
      const homeTarget = { x: guard.homeX + guard.w / 2, y: guard.homeY + guard.h / 2 };
      const homeDistance = moveGuardToward(guard, homeTarget, dt);
      if (homeDistance <= 6) {
        guard.x = guard.homeX;
        guard.y = guard.homeY;
        guard.mode = "patrol";
      }
    } else {
      patrolGuard(guard, dt);
    }

    const attackBox = getGuardAttackBox(guard);
    guard.attackBox = attackBox;
    if (!playerIsAttacking && !debug.invincible && rectsOverlap(getFootBox(state.player), attackBox) && guard.cooldown <= 0 && state.player.invincible <= 0) {
      damagePlayer(balance.guardAttackDamage);
      state.player.invincible = 0.65;
      guard.cooldown = balance.guardAttackCooldown;
      guard.attackFlash = 0.24;
      if (state.player.hp <= 0) {
        failLevel("被保安抓住了");
      }
    }
  }
}

function isPlayerAttacking() {
  return state.levelIndex === 1 && state.playerAction === "attack" && state.playerActionTimer > 0;
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (enemy.type === "matron") {
      updateMatron(enemy, dt);
      const touchedMatron = rectsOverlap(state.player, enemy) || rectsOverlap(getFootBox(state.player), getFootBox(enemy));
      const caughtByMatron = canSeePlayer(enemy) || touchedMatron;
      if (caughtByMatron && state.player.invincible <= 0) {
        damagePlayer(balance.level1SeenDamage);
        state.player.invincible = balance.level1SeenInvincible;
        if (state.player.hp <= 0) failLevel(touchedMatron ? "被宿舍阿姨抓住了" : "被宿舍阿姨发现了");
      }
    }
    if (enemy.type === "doorman") {
      enemy.sleepTimer += dt;
      const doormanState = getDoormanState(enemy);
      if (doormanState.awake && canSeePlayer(enemy)) failLevel("被门卫发现了");
    }
  }

  if (state.levelIndex === 1) updateGuards(dt);
}

function getGuardAttackBox(guard) {
  const footBox = getFootBox(guard);
  const range = balance.guardAttackRange;
  const height = balance.guardAttackHeight;
  const facingRight = guard.dir >= 0;
  return {
    x: facingRight ? footBox.x + footBox.w - 2 : footBox.x - range + 2,
    y: footBox.y + footBox.h / 2 - height / 2,
    w: range,
    h: height,
  };
}

function getAttackRect() {
  const range = balance.playerAttackRange;
  const size = balance.playerAttackSize;
  const center = centerOf(state.player);

  if (state.player.facing === "left") return { x: state.player.x - range, y: center.y - size / 2, w: range, h: size };
  if (state.player.facing === "right") return { x: state.player.x + state.player.w, y: center.y - size / 2, w: range, h: size };
  if (state.player.facing === "up") return { x: center.x - size / 2, y: state.player.y - range, w: size, h: range };
  return { x: center.x - size / 2, y: state.player.y + state.player.h, w: size, h: range };
}

export function attack() {
  if (state.gameState !== "playing" || state.levelIndex !== 1 || state.player.attackCooldown > 0) return;

  const hitBox = getAttackRect();
  state.player.attackCooldown = balance.playerAttackCooldown;
  state.playerAction = "attack";
  state.playerActionTimer = getCharacterActionDuration("player", "attack");
  state.playerActionElapsed = 0;
  state.attackEffect = { ...hitBox, time: 0.14 };

  for (const guard of state.enemies) {
    if (!guard.alive || !rectsOverlap(hitBox, guard)) continue;
    guard.hp -= balance.playerAttackDamage;
    guard.hitFlash = getCharacterActionDuration("guard", "hit");
    if (guard.hp <= 0) guard.alive = false;
  }

  if (state.enemies.every((enemy) => !enemy.alive)) {
    elements.statusText.textContent = "保安全部被击败，冲向出口";
  }
}

function damagePlayer(amount) {
  if (debug.invincible) return;
  state.player.hp = Math.max(0, state.player.hp - amount);
  state.playerHp = state.player.hp;
}

function failLevel(reason) {
  if (debug.invincible) return;
  if (state.gameState !== "playing") return;
  if (state.levelIndex === 0) playCaughtSound();
  const result = failureResults[Math.floor(Math.random() * failureResults.length)];
  const failedLevelIndex = state.levelIndex;
  showOverlay("逃离失败", `${reason}。处罚结果：${result}。2 秒后自动回到本关开始。`, false, false);
  state.failureRestartTimer = setTimeout(() => {
    state.failureRestartTimer = null;
    state.playerHp = balance.playerMaxHp;
    initLevel(failedLevelIndex);
  }, 2000);
}

function checkExit() {
  if (!rectsOverlap(state.player, state.exitZone)) return;

  if (state.levelIndex === 1 && state.enemies.some((enemy) => enemy.alive)) {
    elements.statusText.textContent = "先打败所有保安，出口才会开启";
    return;
  }

  if (state.levelIndex < activeLevelCount - 1) {
    initLevel(state.levelIndex + 1);
    return;
  }

  showOverlay("成功逃离学校", "你已经甩开保安，暂时逃出了学校。", false, true);
}

export function update(dt) {
  if (state.gameState !== "playing") return;

  state.player.attackCooldown = Math.max(0, state.player.attackCooldown - dt);
  state.player.invincible = Math.max(0, state.player.invincible - dt);
  state.animationTime += dt;
  if (state.playerActionTimer > 0) {
    state.playerActionTimer = Math.max(0, state.playerActionTimer - dt);
    state.playerActionElapsed += dt;
    if (state.playerActionTimer <= 0) {
      state.playerAction = null;
      state.playerActionElapsed = 0;
    }
  }
  if (state.attackEffect) {
    state.attackEffect.time -= dt;
    if (state.attackEffect.time <= 0) state.attackEffect = null;
  }
  movePlayer(dt);
  updateEnemies(dt);
  checkExit();
  updateCamera();
  updateHud();
}
