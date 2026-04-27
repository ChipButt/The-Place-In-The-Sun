export const TILE_DEFS = {
  water: { sprite: "water", solid: true },
  shallowWater: { sprite: "shallowWater", solid: true },
  sand: { sprite: "sand", solid: false },
  grass: { sprite: "grass", solid: false },
  grassA: { sprite: "grassA", solid: false },
  grassB: { sprite: "grassB", solid: false },
  grassBlock: { sprite: "grassBlock", solid: false },
  tallGrass: { sprite: "tallGrass", solid: false },
  flowers: { sprite: "flowers", solid: false },
  dirt: { sprite: "dirt", solid: false },
  stone: { sprite: "stone", solid: false },
  caveFloor: { sprite: "caveFloor", solid: false },
  caveWall: { sprite: "caveWall", solid: true },
  houseFloor: { sprite: "houseFloor", solid: false },
  houseWallTile: { sprite: "houseWall", solid: true }
};

export const MAPS = {
  nassau: createNassau(),
  cave01: createCave01(),
  house01: createHouse01(),
  nancysTavern: createNancysTavern()
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

function carvePath(grid, points, width = 1) {
  for (const [x, y] of points) {
    carveRect(grid, x, y, width, width);
  }
}

function makeCollisionBox(id, x, y, w, h) {
  return {
    id,
    collisionOnly: true,
    solid: true,
    x,
    y,
    drawW: 48,
    drawH: 48,
    hitbox: { x, y, w, h }
  };
}

function createNassau() {
  const width = 44;
  const height = 30;
  const ground = createEmptyGrid(width, height, "water");

  paintEllipse(ground, 22, 15, 18, 11, "shallowWater");
  paintEllipse(ground, 22, 15, 16, 10, "sand");

  // Mostly sand with several plantable grass patches inside the island.
  // All three grass types can be planted on. Flower grass is also where seeds can be found.
  paintEllipse(ground, 22, 14, 9, 5, "grass");
  paintRect(ground, 15, 11, 5, 3, "grassA");
  paintRect(ground, 23, 11, 6, 4, "grassB");
  paintRect(ground, 17, 17, 7, 3, "grassA");
  paintRect(ground, 27, 16, 4, 3, "grass");
  paintRect(ground, 14, 14, 2, 2, "flowers");
  paintRect(ground, 20, 10, 2, 1, "flowers");
  paintRect(ground, 25, 18, 2, 1, "flowers");
  paintRect(ground, 30, 13, 2, 2, "flowers");

  // Main walkable areas.
  paintRect(ground, 10, 4, 8, 7, "sand");
  paintRect(ground, 24, 12, 8, 8, "sand");
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
        x: 8,
        y: 18,
        drawW: 192,
        drawH: 144,
        solid: false
      },
      // House blockers: walls block, door approach remains open.
      makeCollisionBox("hutBlockTop", 8, 18, 4, 2),
      makeCollisionBox("hutBlockLeft", 8, 20, 1, 1),
      makeCollisionBox("hutBlockRight", 11, 20, 1, 1),
      {
        id: "hutPlaque",
        sprite: "sign",
        signReadable: true,
        x: 12,
        y: 20,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 12, y: 20, w: 1, h: 1 },
        interaction: {
          type: "dialogue",
          text: "PLAQUE: Private home. Please do not enter without permission."
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
        signReadable: true,
        x: 17.8,
        y: 18.0,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 18, y: 18, w: 1, h: 1 },
        interaction: {
          type: "dialogue",
          text: "SIGN: Welcome to Nassau. Movement is tile-based: one tap or key press moves one tile. Walk onto entrance tiles to load new maps."
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
        interaction: {
          type: "dialogue",
          text: "A small boat. Later this could open sea travel, events, or other islands."
        }
      },
      {
        id: "flowerPatchSign",
        sprite: "sign",
        signReadable: true,
        x: 18,
        y: 16,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 18, y: 16, w: 1, h: 1 },
        interaction: {
          type: "dialogue",
          text: "SIGN: Walk through flower patches and you might find wheat or barley seeds. Plant crops only on grass."
        }
      },
      {
        id: "nancysTavernExterior",
        sprite: "nancysTavern",
        x: 24,
        y: 3,
        drawW: 432,
        drawH: 432,
        solid: false,
        sortY: 0,
        roofOverlay: {
          // Green triangle from markup: only this roof/gable area draws above the player.
          points: [
            { x: 0.95, y: 2.05 },
            { x: 4.5, y: 0.18 },
            { x: 8.05, y: 2.05 }
          ]
        }
      },
      // Nancy exterior blockers based on the red-line markup.
      // Main building / roof / front wall area.
      makeCollisionBox("nancysBlockUpperBody", 24, 5, 9, 4),
      // Terrace left/right side blocking: player cannot stand inside the red-marked deck sections.
      makeCollisionBox("nancysBlockLeftDeck", 24, 9, 3, 1),
      makeCollisionBox("nancysBlockRightDeck", 30, 9, 3, 1),
      // Door posts around the central entrance.
      makeCollisionBox("nancysBlockDoorLeft", 27, 9, 1, 1),
      makeCollisionBox("nancysBlockDoorRight", 29, 9, 1, 1),
      {
        id: "nancysTavernPlaque",
        sprite: "sign",
        signReadable: true,
        x: 33,
        y: 9,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 33, y: 9, w: 1, h: 1 },
        interaction: {
          type: "dialogue",
          text: "PLAQUE: Nancy's Tavern. Eggs, wheat, barley, questionable stories."
        }
      },
      {
        id: "caveMouth",
        sprite: "caveMouth",
        x: 12,
        y: 5,
        drawW: 144,
        drawH: 144,
        solid: false
      },
      makeCollisionBox("caveBlockTop", 12, 5, 3, 2),
      makeCollisionBox("caveBlockBottomLeft", 12, 7, 1, 1),
      makeCollisionBox("caveBlockBottomRight", 14, 7, 1, 1),
      {
        id: "cavePlaque",
        sprite: "sign",
        signReadable: true,
        x: 15,
        y: 7,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 15, y: 7, w: 1, h: 1 },
        interaction: {
          type: "dialogue",
          text: "PLAQUE: Old Smuggler's Cave."
        }
      }
    ],
    npcs: [
      {
        id: "concernedCitizen",
        name: "Concerned Citizen",
        sprite: "citizenDown0",
        x: 21,
        y: 12,
        drawW: 48,
        drawH: 48,
        direction: "down",
        standingSprites: {
          down: "citizenDown0",
          up: "citizenUp0",
          left: "citizenLeft0",
          right: "citizenRight0"
        },
        anims: {
          down: ["citizenDown0", "citizenDown1", "citizenDown0", "citizenDown2"],
          up: ["citizenUp0", "citizenUp1", "citizenUp0", "citizenUp2"],
          left: ["citizenLeft0", "citizenLeft1", "citizenLeft0", "citizenLeft2"],
          right: ["citizenRight0", "citizenRight1", "citizenRight0", "citizenRight2"]
        },
        interaction: { type: "quest", questId: "lost_house_key" },
        dialogue: "I've lost the key to my house. If only someone could find it, I'd happily reward them."
      },
      {
        id: "chicken01",
        name: "Chicken",
        sprite: "chickenWalkDown0",
        x: 20,
        y: 17,
        drawW: 48,
        drawH: 48,
        direction: "down",
        script: "chicken_roam",
        staggerStart: 0,
        dialogue: "Cluck."
      },
      {
        id: "chicken02",
        name: "Chicken",
        sprite: "chickenWalkDown0",
        x: 24,
        y: 16,
        drawW: 48,
        drawH: 48,
        direction: "down",
        script: "chicken_roam",
        staggerStart: 3,
        dialogue: "Bawk."
      },
      {
        id: "chicken03",
        name: "Chicken",
        sprite: "chickenWalkDown0",
        x: 26,
        y: 18,
        drawW: 48,
        drawH: 48,
        direction: "down",
        script: "chicken_roam",
        staggerStart: 7,
        dialogue: "Buk buk."
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
      },
      {
        id: "toNancysTavern",
        // Bottom of the actual door, not the terrace/stairs.
        x: 28,
        y: 9,
        w: 1,
        h: 1,
        targetMap: "nancysTavern",
        targetSpawn: "entrance"
      },
      {
        id: "toHouse01",
        x: 9,
        y: 20,
        w: 2,
        h: 1,
        targetMap: "house01",
        targetSpawn: "entrance"
      }
    ]
  };
}

function createCave01() {
  const width = 28;
  const height = 22;
  const ground = createEmptyGrid(width, height, "caveWall");

  // Main entrance chamber and torch-giver area.
  carveRect(ground, 11, 17, 5, 4);
  carveRect(ground, 12, 12, 3, 6);
  carveRect(ground, 10, 14, 7, 3);

  // Left route towards the real key, with a few small side branches.
  carveRect(ground, 6, 14, 6, 2);
  carveRect(ground, 5, 10, 3, 6);
  carveRect(ground, 3, 9, 5, 3);
  carveRect(ground, 3, 5, 3, 5);
  carveRect(ground, 4, 4, 7, 3);
  carveRect(ground, 8, 7, 2, 3);     // dead-end loop feel
  carveRect(ground, 8, 17, 3, 2);    // lower dead end

  // Right route towards the red herring chest.
  carveRect(ground, 15, 14, 7, 2);
  carveRect(ground, 20, 10, 3, 6);
  carveRect(ground, 22, 8, 3, 4);
  carveRect(ground, 20, 4, 5, 5);
  carveRect(ground, 16, 5, 4, 2);
  carveRect(ground, 17, 8, 2, 3);    // dead end
  carveRect(ground, 22, 17, 3, 2);   // lower dead end

  // A small middle kink so the cave is not just a straight corridor.
  carveRect(ground, 11, 11, 3, 2);
  carveRect(ground, 9, 12, 3, 2);
  carveRect(ground, 15, 11, 3, 2);

  return {
    id: "cave01",
    name: "Old Smuggler's Cave",
    width,
    height,
    ground,
    dark: true,
    torchRadiusTiles: 3,
    spawns: {
      entrance: { tileX: 13, tileY: 19, direction: "up" }
    },
    objects: [
      {
        id: "caveChest",
        sprite: "chest",
        x: 7,
        y: 5,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 7, y: 5, w: 1, h: 1 },
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
        x: 22,
        y: 5,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 22, y: 5, w: 1, h: 1 },
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
        x: 9,
        y: 17,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 9, y: 17, w: 1, h: 1 }
      }
    ],
    npcs: [
      {
        id: "torchGiver",
        name: "Old Lost Pirate",
        sprite: "lostPirateDown0",
        x: 13,
        y: 17,
        drawW: 48,
        drawH: 48,
        direction: "down",
        standingSprites: {
          down: "lostPirateDown0",
          up: "lostPirateUp0",
          left: "lostPirateLeft0",
          right: "lostPirateRight0"
        },
        anims: {
          down: ["lostPirateDown0", "lostPirateDown1", "lostPirateDown0", "lostPirateDown2"],
          up: ["lostPirateUp0", "lostPirateUp1", "lostPirateUp0", "lostPirateUp2"],
          left: ["lostPirateLeft0", "lostPirateLeft1", "lostPirateLeft0", "lostPirateLeft2"],
          right: ["lostPirateRight0", "lostPirateRight1", "lostPirateRight0", "lostPirateRight2"]
        },
        forceIntro: "cave_torch_intro",
        dialogue: "It's too dark in here. Take this torch."
      }
    ],
    portals: [
      {
        id: "toNassau",
        x: 13,
        y: 20,
        w: 1,
        h: 1,
        targetMap: "nassau",
        targetSpawn: "fromCave"
      }
    ]
  };
}

function createHouse01() {
  const width = 12;
  const height = 10;
  const ground = createEmptyGrid(width, height, "houseFloor");

  for (let x = 0; x < width; x++) {
    ground[0][x] = "houseWallTile";
    ground[height - 1][x] = "houseWallTile";
  }
  for (let y = 0; y < height; y++) {
    ground[y][0] = "houseWallTile";
    ground[y][width - 1] = "houseWallTile";
  }
  ground[height - 1][5] = "houseFloor";
  ground[height - 1][6] = "houseFloor";

  return {
    id: "house01",
    name: "First Hut Interior",
    width,
    height,
    ground,
    spawns: {
      entrance: { tileX: 5, tileY: 8, direction: "up" }
    },
    objects: [
      {
        id: "houseTable",
        sprite: "crate",
        x: 5,
        y: 3,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 5, y: 3, w: 1, h: 1 },
        interaction: { type: "dialogue", text: "A simple wooden table. The hut interior system works." }
      },
      {
        id: "houseBarrel",
        sprite: "barrel",
        x: 8,
        y: 5,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 8, y: 5, w: 1, h: 1 },
        interaction: { type: "dialogue", text: "A tidy storage pot. No chickens in here. Sensible." }
      },
      {
        id: "houseSign",
        sprite: "sign",
        signReadable: true,
        x: 3,
        y: 5,
        drawW: 48,
        drawH: 48,
        solid: true,
        hitbox: { x: 3, y: 5, w: 1, h: 1 },
        interaction: { type: "dialogue", text: "SIGN: This is the first enterable house interior. Later it can become a proper home, tavern room, or shop." }
      }
    ],
    npcs: [],
    portals: [
      {
        id: "toNassauFromHouse",
        x: 5,
        y: 9,
        w: 2,
        h: 1,
        targetMap: "nassau",
        targetSpawn: "fromHouse"
      }
    ]
  };
}

function createNancysTavern() {
  const width = 16;
  const height = 12;
  const ground = createEmptyGrid(width, height, "sand");

  return {
    id: "nancysTavern",
    name: "Nancy's Tavern",
    width,
    height,
    ground,
    spawns: {
      entrance: { tileX: 7, tileY: 10, direction: "up" }
    },
    objects: [
      // Back wall and entrance/wooden interior pieces built from the tavern asset sheet.
      ...makeTavernWallObjects(),

      // Bar counter built from actual bar/counter tile sprites.
      ...makeTavernBarObjects(),

      // Tables and chairs using the interior assets.
      ...makeTavernTableSet("tavernTableSetLeft", 3, 7),
      ...makeTavernTableSet("tavernTableSetRight", 11, 7),

      { id: "tavernStorage01", sprite: "tavernCrate", x: 2, y: 2, drawW: 48, drawH: 48, solid: true, hitbox: { x: 2, y: 2, w: 1, h: 1 } },
      { id: "tavernStove01", sprite: "tavernStove", x: 13, y: 2, drawW: 48, drawH: 48, solid: true, hitbox: { x: 13, y: 2, w: 1, h: 1 } },
      { id: "tavernNotice", sprite: "sign", signReadable: true, x: 11, y: 3, drawW: 48, drawH: 48, solid: true, hitbox: { x: 11, y: 3, w: 1, h: 1 }, interaction: { type: "dialogue", text: "NOTICE: Nancy buys eggs, wheat and barley. No tabs. No excuses." } },

      // Invisible room boundaries.
      makeCollisionBox("tavernTopWall", 0, 0, 16, 1),
      makeCollisionBox("tavernLeftWall", 0, 0, 1, 12),
      makeCollisionBox("tavernRightWall", 15, 0, 1, 12)
    ],
    npcs: [
      {
        id: "nancy",
        name: "Nancy",
        // Nancy is locked as south-facing and standing behind the bar.
        sprite: "nancyF04South",
        x: 7,
        y: 3,
        drawW: 48,
        drawH: 51,
        direction: "down",
        interactRange: 2,
        standingSprites: {
          down: "nancyF04South",
          up: "nancyF04South",
          left: "nancyF04South",
          right: "nancyF04South"
        },
        anims: {
          down: ["nancyF04South", "nancyF04South", "nancyF04South", "nancyF04South"],
          up: ["nancyF04South", "nancyF04South", "nancyF04South", "nancyF04South"],
          left: ["nancyF04South", "nancyF04South", "nancyF04South", "nancyF04South"],
          right: ["nancyF04South", "nancyF04South", "nancyF04South", "nancyF04South"]
        },
        interaction: { type: "nancy" },
        dialogue: "Hello my lovelies, how can I help you today then?"
      }
    ],
    portals: [
      {
        id: "toNassauFromTavern",
        x: 7,
        y: 11,
        w: 2,
        h: 1,
        targetMap: "nassau",
        targetSpawn: "fromTavern"
      }
    ]
  };
}

function makeTavernWallObjects() {
  const objects = [];

  for (let x = 1; x < 15; x++) {
    objects.push({
      id: "tavernBackWall_" + x,
      sprite: x === 7 ? "tavernDoor" : (x % 2 ? "tavernWall" : "tavernWallAlt"),
      x,
      y: 1,
      drawW: 48,
      drawH: 48,
      solid: true,
      hitbox: { x, y: 1, w: 1, h: 1 }
    });
  }

  return objects;
}

function makeTavernBarObjects() {
  const objects = [];

  for (let x = 5; x <= 9; x++) {
    objects.push({
      id: "barTop_" + x,
      sprite: "tavernBarTop",
      x,
      y: 4,
      drawW: 48,
      drawH: 48,
      solid: true,
      hitbox: { x, y: 4, w: 1, h: 1 }
    });
  }

  objects.push({ id: "barMug01", sprite: "tavernMug", x: 6, y: 3.58, drawW: 36, drawH: 36, solid: false });
  objects.push({ id: "barBottle01", sprite: "tavernBottle", x: 8, y: 3.58, drawW: 36, drawH: 36, solid: false });

  return objects;
}

function makeTavernTableSet(id, x, y) {
  return [
    { id: id + "_table", sprite: "tavernTable", x, y, drawW: 48, drawH: 48, solid: true, hitbox: { x, y, w: 1, h: 1 }, interaction: { type: "dialogue", text: "A tavern table. Sticky, but structurally sound." } },
    { id: id + "_chairN", sprite: "tavernChair", x, y: y - 1, drawW: 48, drawH: 48, solid: true, hitbox: { x, y: y - 1, w: 1, h: 1 } },
    { id: id + "_chairS", sprite: "tavernChair", x, y: y + 1, drawW: 48, drawH: 48, solid: true, hitbox: { x, y: y + 1, w: 1, h: 1 } },
    { id: id + "_chairW", sprite: "tavernChair", x: x - 1, y, drawW: 48, drawH: 48, solid: true, hitbox: { x: x - 1, y, w: 1, h: 1 } },
    { id: id + "_mug", sprite: "tavernMug", x: x + 0.2, y: y - 0.1, drawW: 28, drawH: 28, solid: false }
  ];
}



export function getSpawnForMap(map, spawnName = "spawn") {
  if (spawnName === "spawn" && map.spawn) return map.spawn;
  if (map.spawns && map.spawns[spawnName]) return map.spawns[spawnName];
  if (map.id === "nassau" && spawnName === "fromCave") {
    return { tileX: 13, tileY: 8, direction: "down" };
  }
  if (map.id === "nassau" && spawnName === "fromHouse") {
    return { tileX: 10, tileY: 21, direction: "down" };
  }
  if (map.id === "nassau" && spawnName === "fromTavern") {
    return { tileX: 28, tileY: 10, direction: "down" };
  }
  return map.spawn || { tileX: 2, tileY: 2, direction: "down" };
}
