import { PLAYER } from "./config.js";
import { canMoveTo } from "./collision.js";

export function createPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    direction: spawn.direction || "down",
    moving: false,
    animTime: 0,
    hitbox: { ...PLAYER.hitbox }
  };
}

export function updatePlayer(player, map, input, dt) {
  let dx = 0;
  let dy = 0;

  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;

    if (Math.abs(dx) > Math.abs(dy)) {
      player.direction = dx > 0 ? "right" : "left";
    } else {
      player.direction = dy > 0 ? "down" : "up";
    }

    const speed = input.run ? PLAYER.runSpeed : PLAYER.speed;
    const moveX = dx * speed * dt;
    const moveY = dy * speed * dt;

    if (canMoveTo(map, player, player.x + moveX, player.y)) player.x += moveX;
    if (canMoveTo(map, player, player.x, player.y + moveY)) player.y += moveY;

    player.moving = true;
    player.animTime += dt;
  } else {
    player.moving = false;
    player.animTime = 0;
  }
}

export function setPlayerSpawn(player, spawn) {
  player.x = spawn.x;
  player.y = spawn.y;
  player.direction = spawn.direction || "down";
  player.moving = false;
  player.animTime = 0;
}
