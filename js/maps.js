export const TILE_DEFS = {
  water: { sprite: "water", solid: true },
  shallowWater: { sprite: "shallowWater", solid: true },
  sand: { sprite: "sand", solid: false },
  grass: { sprite: "grass", solid: false },
  grassA: { sprite: "grassA", solid: false },
  grassB: { sprite: "grassB", solid: false },
  grassBlock: { sprite: "grassBlock", solid: false },
  tallGrass: { sprite: "tallGrass", solid: false },
  dirt: { sprite: "dirt", solid: false },
  stone: { sprite: "stone", solid: false },
  caveFloor: { sprite: "caveFloor", solid: false },
  caveWall: { sprite: "caveWall", solid: true }
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

function carveRect(grid, x, y, w, h) {
  paintRect(grid, x, y, w, h, "caveFloor");
}

function createNassau() {
  const width = 44;
  const height = 30;
  const ground = createEmptyGrid(width, height, "water");

  paintEllipse(ground, 22, 15, 18, 11, "shallowWater");
  paintEllipse(ground, 22, 15, 16, 10, "sand");

  // Mostly sand, with a smaller grass patch using only the locked grass tiles.
  paintEllipse(ground, 22, 14, 5, 3, "grass");
  paintRect(ground, 20, 13, 2, 2, "grassA");
  paintRect(ground, 23, 14, 2, 2, "grassB");

  // Keep walkable sand around main objects/entrances while the layout is still being tested.
  paintRect(ground, 11, 5, 5, 5, "sand");
  paintRect(ground, 24, 12, 7, 8, "sand");
  paintRect(ground, 17, 12, 5, 8, "sand");
  paintLine(ground, [[13, 7], [13, 8], [13, 9], [13, 10]], "sand");
  paintLine(ground, [[22, 20], [22, 21], [22, 22], [22, 23], [22, 24], [22, 25]], "sand");

  return {
    id: "nassau",
    name: "Nassau — Buccaneer Island",
    width,
    height,
    ground,
    spawn: { tileX: 21, tileY: 22, direction: "up" },
    objects: [
      {
        id: "hut",
        sprite: "house",
        x: 27.2,
        y: 5.55,
        drawW: 192,
        drawH: 144,
        solid: true,
        hitbox: { x: 27.2, y: 5.8, w: 4.0, h: 2.25 },
        tapbox: { x: 27.2, y: 5.55, w: 4.0, h: 3.4 },
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
        x: 24,
        y: 13,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 24, y: 13, w: 1, h: 1 },
        interaction: {
          type: "chest",
          chestId: "nassau_battered_chest",
          title: "Battered Chest",
          emptyText: "The battered chest is empty. You already took everything useful.",
          loot: [
            { kind: "gold", amount: 25, label: "25 GP" }
          ]
        }
      },
      {
        id: "sign",
        sprite: "sign",
        x: 17.8,
        y: 18.0,
        drawW: 48,
        drawH: 48,
        solid: false,
        tapbox: { x: 17.65, y: 18.0, w: 1.2, h: 1.7 },
        interaction: {
          type: "dialogue",
          text: "SIGN: Welcome to Nassau. Movement is tile-based: one tap or key press moves one tile. Walk onto the cave entrance to load the second map."
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
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 13.35, y: 9.75, w: 1.0, h: 0.8 }
      },
      {
        id: "barrel01",
        sprite: "barrel",
        x: 26,
        y: 17,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 26, y: 17, w: 1, h: 1 },
        interaction: {
          type: "dialogue",
          text: "A barrel. Probably rum. Probably best not to ask whose."
        }
      },
      {
        id: "crate01",
        sprite: "crate",
        x: 28,
        y: 17,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 28, y: 17, w: 1, h: 1 },
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
        x: 12,
        y: 5,
        drawW: 144,
        drawH: 144,
        solid: false,
        tapbox: { x: 12.0, y: 5.4, w: 2.7, h: 2.8 },
        interaction: {
          type: "dialogue",
          text: "A cave mouth. Walk onto the entrance tile to load the cave map."
        }
      }
    ],
    npcs: [
      {
        id: "concernedCitizen",
        name: "Concerned Citizen",
        sprite: "citizenDown0",
        x: 21.3,
        y: 12.5,
        drawW: 48,
        drawH: 48,
        direction: "down",
        standingSprites: {
          down: "citizenDown0",
          up: "citizenUp0",
          left: "citizenLeft0",
          right: "citizenRight0"
        },
        interaction: { type: "quest", questId: "lost_house_key" },
        dialogue: "I've lost the key to my house. If only someone could find it, I'd happily reward them."
      }
    ],
    portals: [
      {
        id: "toCave",
        x: 13,
        y: 7,
        w: 1,
        h: 1,
        targetMap: "cave01",
        targetSpawn: "entrance"
      }
    ]
  };
}

function createCave01() {
  const width = 24;
  const height = 18;
  const ground = createEmptyGrid(width, height, "caveWall");

  // A simple cave maze: brown floor, stone walls.
  carveRect(ground, 10, 14, 5, 3);   // entrance chamber
  carveRect(ground, 12, 8, 2, 7);    // central vertical path
  carveRect(ground, 9, 10, 7, 3);    // central chamber
  carveRect(ground, 4, 10, 8, 2);    // left branch
  carveRect(ground, 3, 4, 3, 8);     // left vertical branch
  carveRect(ground, 3, 3, 6, 4);     // rusty key chamber
  carveRect(ground, 14, 8, 7, 2);    // right branch
  carveRect(ground, 19, 4, 2, 5);    // right vertical branch
  carveRect(ground, 16, 3, 6, 4);    // red herring chamber
  carveRect(ground, 7, 13, 3, 2);    // small dead-end pocket
  carveRect(ground, 15, 12, 4, 2);   // small dead-end pocket

  return {
    id: "cave01",
    name: "Smuggler's Cave",
    width,
    height,
    ground,
    dark: true,
    torchRadiusTiles: 3,
    spawns: {
      entrance: { tileX: 12, tileY: 15, direction: "up" }
    },
    objects: [
      {
        id: "caveChest",
        sprite: "chest",
        x: 5,
        y: 4,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 5, y: 4, w: 1, h: 1 },
        interaction: {
          type: "chest",
          chestId: "cave_rusty_key_chest",
          title: "Damp Chest",
          emptyText: "The damp chest is empty. The rusty key is gone.",
          loot: [
            { kind: "item", itemId: "rusty_key", label: "Rusty Key" },
            { kind: "gold", amount: 8, label: "8 GP" }
          ]
        }
      },
      {
        id: "redHerringChest",
        sprite: "chest",
        x: 18,
        y: 4,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 18, y: 4, w: 1, h: 1 },
        interaction: {
          type: "chest",
          chestId: "cave_red_herring_chest",
          title: "Oddly Fancy Chest",
          emptyText: "The oddly fancy chest is empty.",
          loot: [
            { kind: "item", itemId: "rouge_mackerel", label: "Rouge Mackerel" },
            { kind: "item", itemId: "super_shiny_key", label: "Super Shiny Key" }
          ]
        }
      },
      {
        id: "caveRock01",
        sprite: "rock",
        x: 8.0,
        y: 13.0,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 8.0, y: 13.2, w: 1.0, h: 0.8 }
      }
    ],
    npcs: [
      {
        id: "torchGiver",
        name: "Lost Explorer",
        sprite: "skeletonDown0",
        x: 12.0,
        y: 13.0,
        drawW: 48,
        drawH: 48,
        direction: "down",
        forceIntro: "cave_torch_intro",
        dialogue: "It's too dark in here. Take this torch."
      }
    ],
    portals: [
      {
        id: "toNassau",
        x: 11.35,
        y: 16.0,
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
    return { tileX: 13, tileY: 8, direction: "down" };
  }
  return map.spawn || { tileX: 2, tileY: 2, direction: "down" };
}
