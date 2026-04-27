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
  const points = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h]
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
    if (!object.solid) continue;
    const hitbox = getObjectHitbox(object);
    if (rectsOverlap(box, hitbox)) return true;
  }

  for (const npc of map.npcs || []) {
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
  const drawW = npc.drawW || 40;
  const drawH = npc.drawH || 58;
  const x = npc.x * TILE_SIZE;
  const y = npc.y * TILE_SIZE;
  return {
    x: x + drawW * 0.22,
    y: y + drawH * 0.68,
    w: drawW * 0.56,
    h: drawH * 0.26
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
