import { TILE_SIZE } from "./config.js";
import {
  getObjectHitbox,
  getNpcHitbox,
  getPlayerHitbox,
  getPortalRect,
  rectsOverlap
} from "./collision.js";

export function findInteraction(map, player) {
  const playerTile = getPlayerTile(player);
  const facingTile = getFacingTile(playerTile, player.direction);

  for (const npc of map.npcs || []) {
    if (npc.hidden) continue;
    if (!canTalkToNpc(playerTile, player.direction, npc)) continue;
    if (npc.interaction) return { ...npc.interaction, npcId: npc.id };
    return { type: "dialogue", text: `${npc.name}: ${npc.dialogue}` };
  }

  for (const object of map.objects || []) {
    if (object.hidden || !object.interaction) continue;

    if (object.signReadable) {
      if (!canReadSign(playerTile, player.direction, object)) continue;
      return object.interaction;
    }

    if (object.interaction.type === "collect_resource" || object.interaction.type === "harvest_crop") {
      if (tileInObjectHitbox(playerTile, object)) return object.interaction;
      continue;
    }

    if (tileInObjectHitbox(facingTile, object)) return object.interaction;
  }

  return null;
}

export function findInteractionAtWorldPoint(map, worldX, worldY) {
  const pointBox = { x: worldX - 6, y: worldY - 6, w: 12, h: 12 };

  for (const npc of map.npcs || []) {
    if (npc.hidden) continue;
    if (rectsOverlap(pointBox, getNpcHitbox(npc))) {
      if (npc.interaction) return { ...npc.interaction, npcId: npc.id };
      return { type: "dialogue", text: `${npc.name}: ${npc.dialogue}` };
    }
  }

  for (const object of [...(map.objects || [])].reverse()) {
    if (object.hidden || !object.interaction) continue;
    if (rectsOverlap(pointBox, getObjectHitbox(object))) return object.interaction;
  }

  return null;
}

export function findPortal(map, player) {
  const playerBox = getPlayerHitbox(player);

  for (const portal of map.portals || []) {
    if (portal.hidden) continue;
    if (rectsOverlap(playerBox, getPortalRect(portal))) return portal;
  }

  return null;
}

export function findPortalAtWorldPoint(map, worldX, worldY) {
  const pointBox = { x: worldX - 6, y: worldY - 6, w: 12, h: 12 };

  for (const portal of map.portals || []) {
    if (portal.hidden) continue;
    if (rectsOverlap(pointBox, inflate(getPortalRect(portal), 22))) return portal;
  }

  return null;
}

function canTalkToNpc(playerTile, playerDirection, npc) {
  const npcTile = { x: Math.round(npc.x), y: Math.round(npc.y) };
  const range = Math.max(1, npc.interactRange || 1);
  const front = getFrontTileForFacing(npcTile, npc.direction || "down", range);
  return sameTile(playerTile, front) && playerDirection === oppositeDirection(npc.direction || "down");
}

function canReadSign(playerTile, playerDirection, object) {
  const box = object.hitbox || { x: Math.round(object.x), y: Math.round(object.y), w: 1, h: 1 };
  const signX = Math.round(box.x);
  const signY = Math.round(box.y);
  const signHeight = Math.max(1, Math.round(box.h || 1));

  const north = { x: signX, y: signY - 1 };
  const south = { x: signX, y: signY + signHeight };

  if (sameTile(playerTile, north)) return playerDirection === "down";
  if (sameTile(playerTile, south)) return playerDirection === "up";
  return false;
}

function tileInObjectHitbox(tile, object) {
  const box = object.hitbox || { x: Math.round(object.x), y: Math.round(object.y), w: 1, h: 1 };
  return tile.x >= Math.floor(box.x) &&
    tile.x < Math.ceil(box.x + box.w) &&
    tile.y >= Math.floor(box.y) &&
    tile.y < Math.ceil(box.y + box.h);
}

function getPlayerTile(player) {
  return {
    x: Math.round((player.x / TILE_SIZE) - 0.5),
    y: Math.round((player.y / TILE_SIZE) - 0.5)
  };
}

function getFacingTile(tile, direction) {
  if (direction === "up") return { x: tile.x, y: tile.y - 1 };
  if (direction === "down") return { x: tile.x, y: tile.y + 1 };
  if (direction === "left") return { x: tile.x - 1, y: tile.y };
  return { x: tile.x + 1, y: tile.y };
}

function getFrontTileForFacing(tile, direction, range = 1) {
  if (direction === "up") return { x: tile.x, y: tile.y - range };
  if (direction === "down") return { x: tile.x, y: tile.y + range };
  if (direction === "left") return { x: tile.x - range, y: tile.y };
  return { x: tile.x + range, y: tile.y };
}

function oppositeDirection(direction) {
  if (direction === "up") return "down";
  if (direction === "down") return "up";
  if (direction === "left") return "right";
  return "left";
}

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

function inflate(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + amount * 2,
    h: rect.h + amount * 2
  };
}
