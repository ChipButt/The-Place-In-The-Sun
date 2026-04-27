import { TILE_SIZE, PLAYER } from "./config.js";
import { canMoveTo } from "./collision.js";

export function createPlayer(spawn) {
  const point = normaliseSpawn(spawn);

  return {
    x: point.x,
    y: point.y,
    startX: point.x,
    startY: point.y,
    targetX: point.x,
    targetY: point.y,
    direction: point.direction || "down",
    moving: false,
    stepping: false,
    stepElapsed: 0,
    animTime: 0,
    hitbox: { ...PLAYER.hitbox }
  };
}

export function updatePlayer(player, map, input, dt) {
  if (player.stepping) {
    continueTileStep(player, dt);
    return;
  }

  const direction = getRequestedDirection(input);
  if (!direction) {
    player.moving = false;
    player.animTime = 0;
    return;
  }

  player.direction = direction;

  const next = getNextTilePoint(player, direction);
  if (!canMoveTo(map, player, next.x, next.y)) {
    player.moving = false;
    player.animTime = 0;
    return;
  }

  beginTileStep(player, next.x, next.y);
  continueTileStep(player, dt);
}

export function setPlayerSpawn(player, spawn) {
  const point = normaliseSpawn(spawn);

  player.x = point.x;
  player.y = point.y;
  player.startX = point.x;
  player.startY = point.y;
  player.targetX = point.x;
  player.targetY = point.y;
  player.direction = point.direction || "down";
  player.moving = false;
  player.stepping = false;
  player.stepElapsed = 0;
  player.animTime = 0;
}

function normaliseSpawn(spawn) {
  if (Number.isFinite(spawn.tileX) && Number.isFinite(spawn.tileY)) {
    return {
      x: (spawn.tileX + 0.5) * TILE_SIZE,
      y: (spawn.tileY + 0.5) * TILE_SIZE,
      direction: spawn.direction || "down"
    };
  }

  return {
    x: spawn.x,
    y: spawn.y,
    direction: spawn.direction || "down"
  };
}

function getRequestedDirection(input) {
  const preferred = input.lastDirection;
  if (preferred && input[preferred]) return preferred;

  // Never combine directions. If two buttons are held, only one tile direction wins.
  if (input.up) return "up";
  if (input.down) return "down";
  if (input.left) return "left";
  if (input.right) return "right";
  return null;
}

function getNextTilePoint(player, direction) {
  const currentTileX = Math.round((player.x / TILE_SIZE) - 0.5);
  const currentTileY = Math.round((player.y / TILE_SIZE) - 0.5);

  let tileX = currentTileX;
  let tileY = currentTileY;

  if (direction === "up") tileY -= 1;
  if (direction === "down") tileY += 1;
  if (direction === "left") tileX -= 1;
  if (direction === "right") tileX += 1;

  return {
    x: (tileX + 0.5) * TILE_SIZE,
    y: (tileY + 0.5) * TILE_SIZE
  };
}

function beginTileStep(player, targetX, targetY) {
  player.startX = player.x;
  player.startY = player.y;
  player.targetX = targetX;
  player.targetY = targetY;
  player.stepElapsed = 0;
  player.stepping = true;
  player.moving = true;
}

function continueTileStep(player, dt) {
  player.stepElapsed += dt;
  player.animTime += dt;

  const t = Math.min(1, player.stepElapsed / PLAYER.stepDuration);
  const eased = easeInOut(t);

  player.x = lerp(player.startX, player.targetX, eased);
  player.y = lerp(player.startY, player.targetY, eased);

  if (t >= 1) {
    player.x = player.targetX;
    player.y = player.targetY;
    player.startX = player.targetX;
    player.startY = player.targetY;
    player.stepping = false;
    player.moving = false;
    player.stepElapsed = 0;
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
