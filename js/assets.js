export const IMAGE_PATHS = {
  // Terrain tiles
  grassBlock: "assets/images/terrain_tiles/grass_tile_a.png",
  grass: "assets/images/terrain_tiles/grass_tile_b.png",
  tallGrass: "assets/images/terrain_tiles/tall_grass_tile.png",
  sand: "assets/images/terrain_tiles/sand_tile.png",
  dirt: "assets/images/terrain_tiles/dirt_tile.png",
  stone: "assets/images/terrain_tiles/stone_tile.png",
  shallowWater: "assets/images/terrain_tiles/shallow_water_tile.png",
  water: "assets/images/terrain_tiles/deep_water_tile.png",
  shoreVertical: "assets/images/terrain_tiles/shore_vertical_tile.png",
  shoreHorizontal: "assets/images/terrain_tiles/shore_horizontal_tile.png",
  shoreInnerCurve: "assets/images/terrain_tiles/shore_inner_curve_tile.png",
  shoreOuterCurve: "assets/images/terrain_tiles/shore_outer_curve_tile.png",
  cliffGrassBlock: "assets/images/terrain_tiles/cliff_grass_block_tile.png",
  rockCliffWall: "assets/images/terrain_tiles/rock_cliff_wall_tile.png",
  smallCliffCornerA: "assets/images/terrain_tiles/small_cliff_corner_tile_a.png",
  smallCliffCornerB: "assets/images/terrain_tiles/small_cliff_corner_tile_b.png",
  grassToSandA: "assets/images/terrain_tiles/grass_to_sand_transition_tile_a.png",
  grassToSandB: "assets/images/terrain_tiles/grass_to_sand_transition_tile_b.png",

  // Environment props
  palmTree: "assets/images/environment_props/palm_tree.png",
  bush: "assets/images/environment_props/bush.png",
  rock: "assets/images/environment_props/rock.png",
  stump: "assets/images/environment_props/tree_stump.png",
  sign: "assets/images/environment_props/signpost.png",
  dock: "assets/images/environment_props/dock.png",

  // Character frames
  playerDown0: "assets/images/character_frames/explorer_down_1.png",
  playerDown1: "assets/images/character_frames/explorer_down_2.png",
  playerDown2: "assets/images/character_frames/explorer_down_3.png",
  playerLeft0: "assets/images/character_frames/explorer_left_1.png",
  playerLeft1: "assets/images/character_frames/explorer_left_2.png",
  playerLeft2: "assets/images/character_frames/explorer_left_3.png",
  playerRight0: "assets/images/character_frames/explorer_right_1.png",
  playerRight1: "assets/images/character_frames/explorer_right_2.png",
  playerRight2: "assets/images/character_frames/explorer_right_3.png",
  playerUp0: "assets/images/character_frames/explorer_up_1.png",
  playerUp1: "assets/images/character_frames/explorer_up_2.png",
  playerUp2: "assets/images/character_frames/explorer_up_3.png",

  // Structures and props
  hut: "assets/images/structures_and_props/hut_with_palm.png",
  chest: "assets/images/structures_and_props/treasure_chest.png",
  boat: "assets/images/structures_and_props/rowboat.png",
  campfire: "assets/images/structures_and_props/campfire.png",
  fence: "assets/images/structures_and_props/fence.png",
  crate: "assets/images/structures_and_props/crate.png",
  barrel: "assets/images/structures_and_props/barrel.png"
};

/*
  These are now individual transparent PNG assets, not crop rectangles from one large sheet.
  That is better for the prototype because each image can be replaced directly.

  Later, once the style is locked, we can pack these into a proper atlas/sprite sheet for performance.
*/
export const SPRITES = Object.fromEntries(
  Object.keys(IMAGE_PATHS).map((key) => [key, { image: key }])
);

export const PLAYER_ANIMS = {
  down: ["playerDown0", "playerDown1", "playerDown2", "playerDown1"],
  up: ["playerUp0", "playerUp1", "playerUp2", "playerUp1"],
  left: ["playerLeft0", "playerLeft1", "playerLeft2", "playerLeft1"],
  right: ["playerRight0", "playerRight1", "playerRight2", "playerRight1"]
};

export async function loadGameImages() {
  const entries = Object.entries(IMAGE_PATHS);
  const loaded = {};

  await Promise.all(entries.map(async ([key, src]) => {
    loaded[key] = await loadImage(src);
  }));

  return loaded;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}
