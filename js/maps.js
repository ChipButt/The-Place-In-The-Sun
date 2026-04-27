import { TILE_SIZE } from "./config.js";

export const TILE_DEFS = {
  water: { sprite: "water", solid: true },
  shallowWater: { sprite: "shallowWater", solid: true },
  sand: { sprite: "sand", solid: false },
  grass: { sprite: "grass", solid: false },
  grassBlock: { sprite: "grassBlock", solid: false },
  tallGrass: { sprite: "tallGrass", solid: false },
  dirt: { sprite: "dirt", solid: false },
  stone: { sprite: "stone", solid: false }
};

export const MAPS = {
  nassau: createNassau(),
  cave01: createCave01()
};

function createEmptyGrid(width, height, tileId = "water") {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => tileId));
}

function paintEllipse(grid, cx, cy, rx, ry, tileId) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if ((dx * dx) + (dy * dy) <= 1) grid[y][x] = tileId;
    }
  }
}

function paintRect(grid, x, y, w, h, tileId) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (grid[yy] && grid[yy][xx] !== undefined) grid[yy][xx] = tileId;
    }
  }
}

function paintLine(grid, points, tileId) {
  for (const [x, y] of points) {
    if (grid[y] && grid[y][x] !== undefined) grid[y][x] = tileId;
  }
}

function createNassau() {
  const width = 44;
  const height = 30;
  const ground = createEmptyGrid(width, height, "water");

  paintEllipse(ground, 22, 15, 18, 11, "shallowWater");
  paintEllipse(ground, 22, 15, 16, 10, "sand");
  paintEllipse(ground, 21, 14, 11, 6, "grass");

  paintRect(ground, 19, 6, 8, 5, "dirt");
  paintRect(ground, 20, 11, 3, 8, "dirt");
  paintRect(ground, 19, 19, 4, 3, "dirt");
  paintLine(ground, [[22, 20], [22, 21], [22, 22], [22, 23], [22, 24], [22, 25]], "dirt");

  paintRect(ground, 8, 16, 6, 3, "tallGrass");
  paintRect(ground, 30, 15, 4, 3, "tallGrass");
  paintRect(ground, 13, 8, 3, 2, "sand");
  paintRect(ground, 29, 8, 4, 2, "sand");
  paintRect(ground, 21, 24, 3, 2, "stone");

  return {
    id: "nassau",
    name: "Nassau — Buccaneer Island",
    width,
    height,
    ground,
    spawn: { x: 21.5 * TILE_SIZE, y: 22.2 * TILE_SIZE, direction: "up" },
    objects: [
      {
        id: "hut",
        sprite: "hut",
        x: 27.2,
        y: 5.55,
        drawW: 245,
        drawH: 172,
        solid: true,
        hitbox: { x: 28.45, y: 7.9, w: 3.55, h: 2.05 },
        tapbox: { x: 27.2, y: 5.55, w: 5.2, h: 3.8 },
        interaction: {
          type: "dialogue",
          text: "This is the first hut on Nassau. Later it can become a shop, quest hub, tavern, or player home."
        }
      },
      {
        id: "campfire",
        sprite: "campfire",
        x: 18.3,
        y: 13.3,
        drawW: 86,
        drawH: 78,
        solid: true,
        hitbox: { x: 18.7, y: 14.2, w: 1.1, h: 0.8 },
        interaction: {
          type: "dialogue",
          text: "The fire crackles. A good spot for a pirate to tell a story badly and swear it was true."
        }
      },
      {
        id: "chest",
        sprite: "chest",
        x: 24.2,
        y: 13.35,
        drawW: 68,
        drawH: 58,
        solid: true,
        hitbox: { x: 24.35, y: 14.05, w: 1.0, h: 0.7 },
        interaction: {
          type: "chest",
          text: "You found a battered chest. Prototype reward: 25 doubloons."
        }
      },
      {
        id: "sign",
        sprite: "sign",
        x: 17.8,
        y: 18.0,
        drawW: 48,
        drawH: 72,
        solid: false,
        tapbox: { x: 17.65, y: 18.0, w: 1.2, h: 1.7 },
        interaction: {
          type: "dialogue",
          text: "SIGN: Welcome to Nassau. Walk to the cave mouth in the north-west to load the second map."
        }
      },
      {
        id: "palm01",
        sprite: "palmTree",
        x: 10.5,
        y: 7.5,
        drawW: 96,
        drawH: 116,
        solid: true,
        hitbox: { x: 11.25, y: 9.35, w: 0.7, h: 1.0 }
      },
      {
        id: "palm02",
        sprite: "palmTree",
        x: 31.2,
        y: 16.2,
        drawW: 86,
        drawH: 106,
        solid: true,
        hitbox: { x: 31.85, y: 17.9, w: 0.7, h: 0.9 }
      },
      {
        id: "rock01",
        sprite: "rock",
        x: 13.2,
        y: 9.2,
        drawW: 62,
        drawH: 56,
        solid: true,
        hitbox: { x: 13.35, y: 9.75, w: 1.0, h: 0.8 }
      },
      {
        id: "barrel01",
        sprite: "barrel",
        x: 26.4,
        y: 17.6,
        drawW: 58,
        drawH: 62,
        solid: true,
        hitbox: { x: 26.55, y: 18.25, w: 0.9, h: 0.8 },
        interaction: {
          type: "dialogue",
          text: "A barrel. Probably rum. Probably best not to ask whose."
        }
      },
      {
        id: "crate01",
        sprite: "crate",
        x: 28.1,
        y: 17.8,
        drawW: 62,
        drawH: 55,
        solid: true,
        hitbox: { x: 28.25, y: 18.35, w: 1.0, h: 0.7 },
        interaction: {
          type: "dialogue",
          text: "A crate marked 'definitely not stolen'. Suspiciously convincing."
        }
      },
      {
        id: "boat",
        sprite: "boat",
        x: 20.9,
        y: 25.0,
        drawW: 126,
        drawH: 75,
        solid: true,
        hitbox: { x: 21.1, y: 25.75, w: 2.1, h: 0.9 },
        tapbox: { x: 20.9, y: 25.0, w: 2.7, h: 1.6 },
        interaction: {
          type: "dialogue",
          text: "A small boat. Later this could open sea travel, events, or other islands."
        }
      },
      {
        id: "caveMouth",
        sprite: "caveMouth",
        x: 12.0,
        y: 4.4,
        drawW: 126,
        drawH: 106,
        solid: true,
        hitbox: { x: 12.25, y: 5.35, w: 2.1, h: 1.5 },
        tapbox: { x: 12.0, y: 4.4, w: 2.7, h: 2.2 },
        interaction: {
          type: "dialogue",
          text: "A cave mouth. Walk into the dark entrance or tap it to load the cave map."
        }
      }
    ],
    npcs: [
      {
        id: "oldBuccaneer",
        name: "Old Buccaneer",
        sprite: "playerDown1",
        x: 21.3,
        y: 12.5,
        drawW: 40,
        drawH: 58,
        direction: "down",
        dialogue: "Arrr. This prototype has the bones: mobile controls, map, movement, collision, NPCs, tap interaction, and portals."
      }
    ],
    portals: [
      {
        id: "toCave",
        x: 13.05,
        y: 5.8,
        w: 1.1,
        h: 0.8,
        targetMap: "cave01",
        targetSpawn: "entrance"
      }
    ]
  };
}

function createCave01() {
  const width = 24;
  const height = 18;
  const ground = createEmptyGrid(width, height, "stone");

  paintRect(ground, 1, 1, width - 2, height - 2, "dirt");
  paintRect(ground, 4, 4, 7, 4, "stone");
  paintRect(ground, 13, 6, 6, 5, "stone");
  paintRect(ground, 7, 12, 9, 3, "stone");

  return {
    id: "cave01",
    name: "Smuggler's Cave",
    width,
    height,
    ground,
    spawns: {
      entrance: { x: 12 * TILE_SIZE, y: 15 * TILE_SIZE, direction: "up" }
    },
    objects: [
      {
        id: "exitSign",
        sprite: "sign",
        x: 12.3,
        y: 13.1,
        drawW: 42,
        drawH: 62,
        solid: false,
        interaction: {
          type: "dialogue",
          text: "SIGN: Step on the light patch below to return to Nassau."
        }
      },
      {
        id: "caveChest",
        sprite: "chest",
        x: 5.3,
        y: 5.0,
        drawW: 64,
        drawH: 54,
        solid: true,
        hitbox: { x: 5.45, y: 5.65, w: 0.95, h: 0.7 },
        interaction: {
          type: "chest",
          text: "You found a damp chest. Prototype reward: one suspiciously shiny spoon."
        }
      },
      {
        id: "caveRock01",
        sprite: "rock",
        x: 16.2,
        y: 5.0,
        drawW: 62,
        drawH: 56,
        solid: true,
        hitbox: { x: 16.35, y: 5.6, w: 1.0, h: 0.8 }
      },
      {
        id: "caveRock02",
        sprite: "rock",
        x: 17.4,
        y: 9.8,
        drawW: 62,
        drawH: 56,
        solid: true,
        hitbox: { x: 17.55, y: 10.4, w: 1.0, h: 0.8 }
      }
    ],
    npcs: [
      {
        id: "lostPirate",
        name: "Lost Pirate",
        sprite: "playerDown1",
        x: 15.2,
        y: 12.2,
        drawW: 40,
        drawH: 58,
        direction: "down",
        dialogue: "I came in looking for treasure and found the second map loader. Not as shiny, but much more useful."
      }
    ],
    portals: [
      {
        id: "toNassau",
        x: 11.35,
        y: 15.3,
        w: 1.4,
        h: 1.0,
        targetMap: "nassau",
        targetSpawn: "fromCave"
      }
    ]
  };
}

export function getSpawnForMap(map, spawnName = "spawn") {
  if (spawnName === "spawn" && map.spawn) return map.spawn;
  if (map.spawns && map.spawns[spawnName]) return map.spawns[spawnName];
  if (map.id === "nassau" && spawnName === "fromCave") {
    return { x: 13.4 * TILE_SIZE, y: 7.4 * TILE_SIZE, direction: "down" };
  }
  return map.spawn || { x: TILE_SIZE * 2, y: TILE_SIZE * 2, direction: "down" };
}
