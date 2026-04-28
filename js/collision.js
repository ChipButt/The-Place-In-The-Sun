import { TILE_SIZE } from "./config.js";
import { TILE_DEFS } from "./maps.js";

export function getPlayerHitbox(player, nextX = player.x, nextY = player.y) {
  return {
    x: nextX + player.hitbox.offsetX,
    y: nextY + player.hitbox.offsetY,
    w: player.hitbox.width,
    h: player.hitbox.height
  };
}

export function canMoveTo(map, player, nextX, nextY) {
  const box = getPlayerHitbox(player, nextX, nextY);
  return !hitsSolidTile(map, box) && !hitsSolidObject(map, box);
}

export function hitsSolidTile(map, box) {
  // Use a tiny inset on the far edges. Without this, standing exactly next to
  // water/walls can count as touching the neighbouring solid tile, creating
  // an unwanted one-tile invisible barrier around shorelines and cave walls.
  const right = box.x + box.w - 0.5;
  const bottom = box.y + box.h - 0.5;
  const points = [
    [box.x + 0.5, box.y + 0.5],
    [right, box.y + 0.5],
    [box.x + 0.5, bottom],
    [right, bottom]
  ];

  for (const [px, py] of points) {
    const tx = Math.floor(px / TILE_SIZE);
    const ty = Math.floor(py / TILE_SIZE);

    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;

    const tileId = map.ground[ty][tx];
    if (TILE_DEFS[tileId]?.solid) return true;
  }

  return false;
}

export function hitsSolidObject(map, box) {
  for (const object of map.objects || []) {
    if (!object.solid || object.hidden) continue;
    const hitbox = getObjectHitbox(object);
    if (rectsOverlap(box, hitbox)) return true;
  }

  for (const npc of map.npcs || []) {
    if (npc.hidden) continue;
    const hitbox = getNpcHitbox(npc);
    if (rectsOverlap(box, hitbox)) return true;
  }

  return false;
}

export function getObjectHitbox(object) {
  if (object.hitbox) {
    return {
      x: object.hitbox.x * TILE_SIZE,
      y: object.hitbox.y * TILE_SIZE,
      w: object.hitbox.w * TILE_SIZE,
      h: object.hitbox.h * TILE_SIZE
    };
  }

  return {
    x: object.x * TILE_SIZE,
    y: object.y * TILE_SIZE,
    w: object.drawW || TILE_SIZE,
    h: object.drawH || TILE_SIZE
  };
}

export function getNpcHitbox(npc) {
  return {
    x: npc.x * TILE_SIZE,
    y: npc.y * TILE_SIZE,
    w: TILE_SIZE,
    h: TILE_SIZE
  };
}

export function getPortalRect(portal) {
  return {
    x: portal.x * TILE_SIZE,
    y: portal.y * TILE_SIZE,
    w: portal.w * TILE_SIZE,
    h: portal.h * TILE_SIZE
  };
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
