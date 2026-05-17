const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelNameEl = document.getElementById("levelName");
const levelProgressEl = document.getElementById("levelProgress");
const statusTextEl = document.getElementById("statusText");
const playerStatsEl = document.getElementById("playerStats");
const overlayEl = document.getElementById("messageOverlay");
const messageTitleEl = document.getElementById("messageTitle");
const messageTextEl = document.getElementById("messageText");
const overlayActionsEl = document.querySelector(".overlay-actions");
const restartLevelBtn = document.getElementById("restartLevelBtn");
const restartGameBtn = document.getElementById("restartGameBtn");
const attackBtn = document.getElementById("attackBtn");

const WORLD = { width: 960, height: 540 };
const keys = new Set();
const touchDirs = new Set();

let lastTime = 0;
let levelIndex = 0;
let state = "playing";
let player;
let enemies = [];
let obstacles = [];
let exitZone;
let attackEffect = null;
let damageFlash = 0;
let failureRestartTimer = null;

const failureResults = ["全校通报批评", "叫家长", "写检讨"];

const levels = [
  {
    name: "宿舍",
    objective: "躲开宿舍阿姨的目光，冲向右侧出口",
    background: "#314354",
    spawn: { x: 72, y: 430 },
    exit: { x: 884, y: 218, w: 52, h: 104, label: "出口" },
    obstacles: [
      { x: 112, y: 74, w: 144, h: 52, color: "#86a4be", label: "床" },
      { x: 112, y: 168, w: 144, h: 52, color: "#86a4be", label: "床" },
      { x: 112, y: 262, w: 144, h: 52, color: "#86a4be", label: "床" },
      { x: 344, y: 86, w: 72, h: 148, color: "#b08b5d", label: "柜" },
      { x: 510, y: 300, w: 170, h: 50, color: "#bf9a6a", label: "桌" },
      { x: 710, y: 92, w: 64, h: 190, color: "#7e9b73", label: "书架" },
      { x: 312, y: 392, w: 180, h: 44, color: "#bf9a6a", label: "长桌" },
    ],
    enemies: [
      {
        type: "matron",
        x: 360,
        y: 250,
        w: 34,
        h: 42,
        speed: 96,
        minX: 300,
        maxX: 760,
        dir: 1,
        visionW: 260,
        visionH: 110,
      },
    ],
  },
  {
    name: "操场",
    objective: "击败所有学校保安，出口才会开启",
    background: "#4b7f58",
    spawn: { x: 78, y: 270 },
    exit: { x: 884, y: 220, w: 54, h: 100, label: "校门方向" },
    obstacles: [
      { x: 172, y: 84, w: 620, h: 42, color: "#b44c45", label: "跑道" },
      { x: 178, y: 414, w: 610, h: 42, color: "#b44c45", label: "跑道" },
      { x: 420, y: 206, w: 118, h: 92, color: "#d1c15a", label: "沙坑" },
      { x: 650, y: 210, w: 44, h: 112, color: "#64748b", label: "器材" },
      { x: 262, y: 218, w: 46, h: 96, color: "#64748b", label: "单杠" },
    ],
    enemies: [
      { type: "guard", x: 360, y: 166, w: 34, h: 42, hp: 2, speed: 76, minX: 318, maxX: 512, dir: 1, detectRange: 210, cooldown: 0 },
      { type: "guard", x: 710, y: 176, w: 34, h: 42, hp: 2, speed: 82, minX: 704, maxX: 836, dir: -1, detectRange: 220, cooldown: 0 },
      { type: "guard", x: 604, y: 348, w: 34, h: 42, hp: 3, speed: 70, minX: 540, maxX: 792, dir: 1, detectRange: 230, cooldown: 0 },
    ],
  },
  {
    name: "学校大门",
    objective: "第三关待开发：你已经暂时逃到校门口",
    background: "#596069",
    spawn: { x: 110, y: 270 },
    exit: { x: 790, y: 186, w: 96, h: 168, label: "大门" },
    obstacles: [
      { x: 366, y: 154, w: 72, h: 232, color: "#45505c", label: "门柱" },
      { x: 520, y: 154, w: 72, h: 232, color: "#45505c", label: "门柱" },
      { x: 190, y: 332, w: 110, h: 66, color: "#6b7280", label: "保安亭" },
    ],
    enemies: [],
    placeholder: true,
  },
];

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function centerOf(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function cloneRect(rect) {
  return { ...rect };
}

function initLevel(index) {
  clearFailureRestartTimer();
  const level = levels[index];
  levelIndex = index;
  state = "playing";
  obstacles = level.obstacles.map(cloneRect);
  exitZone = cloneRect(level.exit);
  enemies = level.enemies.map((enemy) => ({
    ...enemy,
    maxHp: enemy.hp || 1,
    alive: true,
    hitFlash: 0,
    homeX: enemy.x,
    homeY: enemy.y,
    patrolDir: enemy.dir || 1,
    mode: "patrol",
  }));
  player = {
    x: level.spawn.x,
    y: level.spawn.y,
    w: 30,
    h: 38,
    speed: 172,
    hp: 100,
    facing: "right",
    attackCooldown: 0,
    invincible: 0,
  };
  attackEffect = null;
  damageFlash = 0;
  hideOverlay();
  updateHud();

  if (level.placeholder) {
    showOverlay("抵达学校大门", "第三关暂时待开发。你已经完成当前框架中的逃离目标。", true);
  }
}

function restartGame() {
  initLevel(0);
}

function clearFailureRestartTimer() {
  if (!failureRestartTimer) return;
  clearTimeout(failureRestartTimer);
  failureRestartTimer = null;
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

function showOverlay(title, text, keepPlaying = false, showActions = true) {
  messageTitleEl.textContent = title;
  messageTextEl.textContent = text;
  overlayActionsEl.style.display = showActions ? "flex" : "none";
  overlayEl.classList.remove("hidden");
  if (!keepPlaying) state = title.includes("失败") ? "failed" : "paused";
}

function updateHud() {
  const level = levels[levelIndex];
  levelNameEl.textContent = level.name;
  levelProgressEl.textContent = `${levelIndex + 1}/3`;
  statusTextEl.textContent = level.objective;

  if (levelIndex === 1) {
    const guardCount = enemies.filter((enemy) => enemy.alive).length;
    playerStatsEl.textContent = `生命 ${Math.max(0, Math.ceil(player.hp))} | 保安 ${guardCount}`;
  } else {
    playerStatsEl.textContent = `生命 ${Math.max(0, Math.ceil(player.hp))}`;
  }
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
    if (Math.abs(x) > Math.abs(y)) player.facing = x > 0 ? "right" : "left";
    else player.facing = y > 0 ? "down" : "up";
  }

  return { x, y };
}

function canOccupy(rect, ignoreEnemy = null) {
  if (rect.x < 12 || rect.y < 52 || rect.x + rect.w > WORLD.width - 12 || rect.y + rect.h > WORLD.height - 12) {
    return false;
  }

  if (obstacles.some((obstacle) => rectsOverlap(rect, obstacle))) return false;

  return !enemies.some((enemy) => enemy !== ignoreEnemy && enemy.alive && rectsOverlap(rect, enemy));
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
  const input = getInputVector();
  moveEntity(player, input.x * player.speed * dt, input.y * player.speed * dt);
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

function getVisionRect(enemy) {
  if (enemy.dir >= 0) {
    return {
      x: enemy.x + enemy.w,
      y: enemy.y + enemy.h / 2 - enemy.visionH / 2,
      w: enemy.visionW,
      h: enemy.visionH,
    };
  }

  return {
    x: enemy.x - enemy.visionW,
    y: enemy.y + enemy.h / 2 - enemy.visionH / 2,
    w: enemy.visionW,
    h: enemy.visionH,
  };
}

function lineIntersectsRect(a, b, rect) {
  const steps = 18;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const point = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
    if (point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h) {
      return true;
    }
  }
  return false;
}

function canSeePlayer(enemy) {
  const vision = getVisionRect(enemy);
  if (!rectsOverlap(player, vision)) return false;

  const enemyCenter = centerOf(enemy);
  const playerCenter = centerOf(player);
  return !obstacles.some((obstacle) => lineIntersectsRect(enemyCenter, playerCenter, obstacle));
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
  const playerCenter = centerOf(player);

  for (const guard of enemies) {
    if (!guard.alive) continue;

    guard.cooldown = Math.max(0, guard.cooldown - dt);
    guard.hitFlash = Math.max(0, guard.hitFlash - dt);

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

    if (rectsOverlap(player, guard) && guard.cooldown <= 0 && player.invincible <= 0) {
      player.hp -= 15;
      player.invincible = 0.65;
      guard.cooldown = 0.9;
      damageFlash = 0.22;
      if (player.hp <= 0) {
        failLevel("被保安抓住了");
      }
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (enemy.type === "matron") {
      updateMatron(enemy, dt);
      if (canSeePlayer(enemy)) failLevel("被宿舍阿姨发现了");
    }
  }

  if (levelIndex === 1) updateGuards(dt);
}

function getAttackRect() {
  const range = 58;
  const size = 44;
  const center = centerOf(player);

  if (player.facing === "left") return { x: player.x - range, y: center.y - size / 2, w: range, h: size };
  if (player.facing === "right") return { x: player.x + player.w, y: center.y - size / 2, w: range, h: size };
  if (player.facing === "up") return { x: center.x - size / 2, y: player.y - range, w: size, h: range };
  return { x: center.x - size / 2, y: player.y + player.h, w: size, h: range };
}

function attack() {
  if (state !== "playing" || levelIndex !== 1 || player.attackCooldown > 0) return;

  const hitBox = getAttackRect();
  player.attackCooldown = 0.38;
  attackEffect = { ...hitBox, time: 0.14 };

  for (const guard of enemies) {
    if (!guard.alive || !rectsOverlap(hitBox, guard)) continue;
    guard.hp -= 1;
    guard.hitFlash = 0.18;
    if (guard.hp <= 0) guard.alive = false;
  }

  if (enemies.every((enemy) => !enemy.alive)) {
    statusTextEl.textContent = "保安全部被击败，冲向出口";
  }
}

function failLevel(reason) {
  if (state !== "playing") return;
  const result = failureResults[Math.floor(Math.random() * failureResults.length)];
  const failedLevelIndex = levelIndex;
  showOverlay("逃离失败", `${reason}。处罚结果：${result}。2 秒后自动回到本关开始。`, false, false);
  failureRestartTimer = setTimeout(() => {
    failureRestartTimer = null;
    initLevel(failedLevelIndex);
  }, 2000);
}

function checkExit() {
  if (!rectsOverlap(player, exitZone)) return;

  if (levelIndex === 1 && enemies.some((enemy) => enemy.alive)) {
    statusTextEl.textContent = "先打败所有保安，出口才会开启";
    return;
  }

  if (levelIndex < levels.length - 1) {
    initLevel(levelIndex + 1);
  }
}

function update(dt) {
  if (state !== "playing") return;

  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  if (attackEffect) {
    attackEffect.time -= dt;
    if (attackEffect.time <= 0) attackEffect = null;
  }
  damageFlash = Math.max(0, damageFlash - dt);

  movePlayer(dt);
  updateEnemies(dt);
  checkExit();
  updateHud();
}

function drawRect(rect, color, label) {
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

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
}

function drawExit() {
  const open = levelIndex !== 1 || enemies.every((enemy) => !enemy.alive);
  ctx.fillStyle = open ? "rgba(101, 221, 143, 0.78)" : "rgba(145, 145, 145, 0.65)";
  ctx.fillRect(exitZone.x, exitZone.y, exitZone.w, exitZone.h);
  ctx.strokeStyle = open ? "#d7ffe4" : "#d5d5d5";
  ctx.lineWidth = 3;
  ctx.strokeRect(exitZone.x, exitZone.y, exitZone.w, exitZone.h);
  ctx.fillStyle = "#102018";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(open ? exitZone.label : "未开启", exitZone.x + exitZone.w / 2, exitZone.y + exitZone.h / 2);
}

function drawPlayer() {
  const flashing = player.invincible > 0 && Math.floor(player.invincible * 16) % 2 === 0;
  ctx.fillStyle = flashing ? "#ffffff" : "#4cc9f0";
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = "#083344";
  ctx.fillRect(player.x + 7, player.y + 8, player.w - 14, 7);
  ctx.fillStyle = "#ffffff";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("玩家", player.x + player.w / 2, player.y + player.h + 4);
}

function drawMatron(enemy) {
  const vision = getVisionRect(enemy);
  ctx.fillStyle = canSeePlayer(enemy) ? "rgba(255, 52, 52, 0.48)" : "rgba(255, 222, 89, 0.25)";
  ctx.fillRect(vision.x, vision.y, vision.w, vision.h);
  ctx.strokeStyle = "rgba(255, 239, 137, 0.75)";
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(vision.x, vision.y, vision.w, vision.h);
  ctx.setLineDash([]);

  drawRect(enemy, "#d94679", "宿管");
}

function drawGuard(enemy) {
  const color = enemy.hitFlash > 0 ? "#ffffff" : "#f97316";
  drawRect(enemy, color, "保安");

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(enemy.x, enemy.y - 9, enemy.w, 5);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(enemy.x, enemy.y - 9, enemy.w * Math.max(0, enemy.hp) / enemy.maxHp, 5);
}

function drawAttackEffect() {
  if (!attackEffect) return;
  ctx.fillStyle = "rgba(255, 236, 128, 0.5)";
  ctx.fillRect(attackEffect.x, attackEffect.y, attackEffect.w, attackEffect.h);
  ctx.strokeStyle = "#fff3a3";
  ctx.lineWidth = 2;
  ctx.strokeRect(attackEffect.x, attackEffect.y, attackEffect.w, attackEffect.h);
}

function drawPlaceholderGate() {
  if (!levels[levelIndex].placeholder) return;
  ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
  ctx.fillRect(290, 72, 380, 76);
  ctx.fillStyle = "#fff8dc";
  ctx.font = "26px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("第三关待开发", WORLD.width / 2, 110);
}

function render() {
  const level = levels[levelIndex];
  drawBackground(level);
  drawExit();
  for (const obstacle of obstacles) drawRect(obstacle, obstacle.color, obstacle.label);
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (enemy.type === "matron") drawMatron(enemy);
    if (enemy.type === "guard") drawGuard(enemy);
  }
  drawAttackEffect();
  drawPlayer();
  drawPlaceholderGate();

  if (damageFlash > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash * 1.5})`;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "j"].includes(key)) {
    event.preventDefault();
  }
  if (key === " " || key === "j") attack();
  else keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

["contextmenu", "selectstart", "dragstart"].forEach((eventName) => {
  window.addEventListener(eventName, (event) => {
    event.preventDefault();
  });
});

document.querySelectorAll(".control-btn").forEach((button) => {
  const dir = button.dataset.dir;
  const start = (event) => {
    event.preventDefault();
    touchDirs.add(dir);
    button.classList.add("active");
  };
  const end = (event) => {
    event.preventDefault();
    touchDirs.delete(dir);
    button.classList.remove("active");
  };
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointercancel", end);
  button.addEventListener("pointerleave", end);
});

attackBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  attackBtn.classList.add("active");
  attack();
});

attackBtn.addEventListener("pointerup", () => {
  attackBtn.classList.remove("active");
});

attackBtn.addEventListener("pointercancel", () => {
  attackBtn.classList.remove("active");
});

restartLevelBtn.addEventListener("click", () => initLevel(levelIndex));
restartGameBtn.addEventListener("click", restartGame);

initLevel(0);
requestAnimationFrame(loop);
