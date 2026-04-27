import { TILE_SIZE } from "./config.js";
import {
  getObjectHitbox,
  getNpcHitbox,
  getPlayerHitbox,
  getPortalRect,
  rectsOverlap
} from "./collision.js";

export function findInteraction(map, player) {
  const reachBox = getReachBox(player);

  for (const npc of map.npcs || []) {
    if (npc.hidden) continue;
    if (rectsOverlap(reachBox, inflate(getNpcHitbox(npc), 10))) {
      if (npc.interaction) return { ...npc.interaction, npcId: npc.id };
      return { type: "dialogue", text: `${npc.name}: ${npc.dialogue}` };
    }
  }

  for (const object of map.objects || []) {
    if (object.hidden || !object.interaction) continue;
    if (rectsOverlap(reachBox, inflate(getObjectHitbox(object), 10))) {
      return object.interaction;
    }
  }

  return null;
}

export function findInteractionAtWorldPoint(map, worldX, worldY) {
  const pointBox = { x: worldX - 6, y: worldY - 6, w: 12, h: 12 };

  for (const npc of map.npcs || []) {
    if (npc.hidden) continue;
    if (rectsOverlap(pointBox, inflate(getNpcHitbox(npc), 14))) {
      if (npc.interaction) return { ...npc.interaction, npcId: npc.id };
      return { type: "dialogue", text: `${npc.name}: ${npc.dialogue}` };
    }
  }

  for (const object of [...(map.objects || [])].reverse()) {
    if (object.hidden || !object.interaction) continue;
    const tappable = object.tapbox ? getTileRect(object.tapbox) : inflate(getObjectHitbox(object), 14);
    if (rectsOverlap(pointBox, tappable)) return object.interaction;
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

function getReachBox(player) {
  const base = getPlayerHitbox(player);
  // Reach covers the adjacent tile so chests/barrels can be opened while standing one tile away.
  const reach = TILE_SIZE;

  if (player.direction === "up") return { x: base.x - 8, y: base.y - reach, w: base.w + 16, h: base.h + reach };
  if (player.direction === "down") return { x: base.x - 8, y: base.y, w: base.w + 16, h: base.h + reach };
  if (player.direction === "left") return { x: base.x - reach, y: base.y - 8, w: base.w + reach, h: base.h + 16 };
  return { x: base.x, y: base.y - 8, w: base.w + reach, h: base.h + 16 };
}

function getTileRect(rect) {
  return {
    x: rect.x * TILE_SIZE,
    y: rect.y * TILE_SIZE,
    w: rect.w * TILE_SIZE,
    h: rect.h * TILE_SIZE
  };
}

function inflate(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + amount * 2,
    h: rect.h + amount * 2
  };
}
