export const IMAGE_PATHS = {
  basictiles: "assets/images/sheets/basictiles.png",
  characters: "assets/images/sheets/characters.png",
  things: "assets/images/sheets/things.png",
  dead: "assets/images/sheets/dead.png",
  fontlarge: "assets/images/sheets/fontlarge.png",
  fontsmall1: "assets/images/sheets/fontsmall1.gif",
  fontsmall2: "assets/images/sheets/fontsmall2.gif",
  chickenWalk: "assets/images/farming/chicken_walk.png",
  chickenEat: "assets/images/farming/chicken_eat.png",
  eggIcon: "assets/images/farming/egg.png",
  fields: "assets/images/farming/fields.png",
  wheatCrop0Img: "assets/images/farming/crops/wheat_0.png",
  wheatCrop1Img: "assets/images/farming/crops/wheat_1.png",
  wheatCrop2Img: "assets/images/farming/crops/wheat_2.png",
  wheatCrop3Img: "assets/images/farming/crops/wheat_3.png",
  wheatCrop4Img: "assets/images/farming/crops/wheat_4.png",
  barleyCrop0Img: "assets/images/farming/crops/barley_0.png",
  barleyCrop1Img: "assets/images/farming/crops/barley_1.png",
  barleyCrop2Img: "assets/images/farming/crops/barley_2.png",
  barleyCrop3Img: "assets/images/farming/crops/barley_3.png",
  barleyCrop4Img: "assets/images/farming/crops/barley_4.png",
  nancysTavern: "assets/images/buildings/nancys-v1.png",
  nancyF04: "assets/images/characters/Females/F_04.png",
  citizenM05: "assets/images/characters/Males/M_05.png",
  nancysBarAssets: "assets/images/interiors/nancys_bar_assets.png"
};

const CELL = 16;

function tile(sheet, col, row, w = 1, h = 1) {
  return {
    image: sheet,
    sx: col * CELL,
    sy: row * CELL,
    sw: w * CELL,
    sh: h * CELL
  };
}

function characterFrame(col, row) {
  return tile("characters", col, row);
}

function sprite(sheet, sx, sy, sw, sh) {
  return { image: sheet, sx, sy, sw, sh };
}

function chickenWalkFrame(col, row) {
  return { image: "chickenWalk", sx: col * 32, sy: row * 32, sw: 32, sh: 32 };
}

function chickenEatFrame(col, row) {
  return { image: "chickenEat", sx: col * 32, sy: row * 32, sw: 32, sh: 32 };
}

function characterSet(id, name, startCol) {
  const downStand = characterFrame(startCol + 1, 0);
  const leftStand = characterFrame(startCol + 1, 1);
  const rightStand = characterFrame(startCol + 1, 2);
  const upStand = characterFrame(startCol + 1, 3);

  return {
    id,
    name,
    portrait: `${id}Down0`,
    anims: {
      down: [`${id}Down0`, `${id}Down1`, `${id}Down0`, `${id}Down2`],
      left: [`${id}Left0`, `${id}Left1`, `${id}Left0`, `${id}Left2`],
      right: [`${id}Right0`, `${id}Right1`, `${id}Right0`, `${id}Right2`],
      up: [`${id}Up0`, `${id}Up1`, `${id}Up0`, `${id}Up2`]
    },
    frames: {
      [`${id}Down0`]: downStand,
      [`${id}Down1`]: characterFrame(startCol, 0),
      [`${id}Down2`]: characterFrame(startCol + 2, 0),
      [`${id}Left0`]: leftStand,
      [`${id}Left1`]: characterFrame(startCol, 1),
      [`${id}Left2`]: characterFrame(startCol + 2, 1),
      [`${id}Right0`]: rightStand,
      [`${id}Right1`]: characterFrame(startCol, 2),
      [`${id}Right2`]: characterFrame(startCol + 2, 2),
      [`${id}Up0`]: upStand,
      [`${id}Up1`]: characterFrame(startCol, 3),
      [`${id}Up2`]: characterFrame(startCol + 2, 3)
    }
  };
}

const playableOne = characterSet("player_one", "Buccaneer One", 3);
const playableTwo = characterSet("player_two", "Buccaneer Two", 6);
const citizen = characterSet("citizen", "Concerned Citizen", 0);
const lostPirate = characterSet("lostPirate", "Old Lost Pirate", 9);
const nancy = characterSet("nancy", "Nancy", 0);

function f04Frame(col, row) {
  return { image: "nancyF04", sx: col * 16, sy: row * 17, sw: 16, sh: 17 };
}

function m05Frame(col, row) {
  return { image: "citizenM05", sx: col * 16, sy: row * 17, sw: 16, sh: 17 };
}

export const SPRITES = {
  // Terrain tiles from basictiles.png.
  // User-locked basic tile selections. Co-ordinates here are zero-indexed.
  // Water = 3 down / 6 across on basictiles.png -> col 5, row 2.
  water: tile("basictiles", 5, 2),
  shallowWater: tile("basictiles", 5, 2),

  // Grass must only use 2 down / 5 across, plus 9 down / 1 and 2 across.
  grass: tile("basictiles", 4, 1),
  grassA: tile("basictiles", 0, 8),
  grassB: tile("basictiles", 1, 8),
  grassBlock: tile("basictiles", 4, 1),
  tallGrass: tile("basictiles", 0, 8),

  sand: tile("basictiles", 2, 1),
  dirt: tile("basictiles", 0, 9),
  stone: tile("basictiles", 0, 0),
  caveFloor: tile("basictiles", 0, 1),
  caveWall: tile("basictiles", 0, 0),

  // Props and object sprites.
  sign: tile("basictiles", 3, 8),
  palmTree: { image: "palmTreeCustom" },
  bush: tile("basictiles", 4, 8),
  rock: tile("basictiles", 2, 7),
  stump: tile("basictiles", 4, 3),
  campfire: tile("basictiles", 4, 7),
  // Barrel/crate placeholder now uses the pot tile: 4 down / 4 across -> col 3, row 3.
  crate: tile("basictiles", 3, 3),
  barrel: tile("basictiles", 3, 3),
  chest: tile("things", 6, 0),
  chestOpen: tile("things", 6, 1),
  boat: { image: "dockCustom" },
  houseDoor: tile("basictiles", 0, 6),
  houseWall: tile("basictiles", 1, 9),
  houseFloor: tile("basictiles", 0, 1),
  houseWindow: tile("basictiles", 1, 10),
  caveRockBlock: tile("basictiles", 7, 1),
  caveEntranceTile: tile("basictiles", 2, 6),
  flowers: tile("basictiles", 1, 8),
  // Crop stages are now clean tile-sized replacement sprites.
  wheatCrop0: { image: "wheatCrop0Img" },
  wheatCrop1: { image: "wheatCrop1Img" },
  wheatCrop2: { image: "wheatCrop2Img" },
  wheatCrop3: { image: "wheatCrop3Img" },
  wheatCrop4: { image: "wheatCrop4Img" },
  wheatCrop: { image: "wheatCrop4Img" },
  barleyCrop0: { image: "barleyCrop0Img" },
  barleyCrop1: { image: "barleyCrop1Img" },
  barleyCrop2: { image: "barleyCrop2Img" },
  barleyCrop3: { image: "barleyCrop3Img" },
  barleyCrop4: { image: "barleyCrop4Img" },
  barleyCrop: { image: "barleyCrop4Img" },
  egg: { image: "eggIcon", sx: 0, sy: 0, sw: 32, sh: 32 },
  nancysTavern: { image: "nancysTavern" },
  tavernWall: tile("nancysBarAssets", 0, 7),
  tavernWallAlt: tile("nancysBarAssets", 1, 7),
  tavernDoor: tile("nancysBarAssets", 7, 7),
  tavernBarLeft: tile("nancysBarAssets", 5, 11),
  tavernBarMid: tile("nancysBarAssets", 6, 11),
  tavernBarRight: tile("nancysBarAssets", 8, 11),
  tavernChair: tile("nancysBarAssets", 11, 11),
  tavernChairAlt: tile("nancysBarAssets", 11, 12),
  tavernTable: tile("nancysBarAssets", 10, 11),
  tavernMug: tile("nancysBarAssets", 14, 9),
  tavernBottle: tile("nancysBarAssets", 16, 9),
  tavernCrate: tile("nancysBarAssets", 16, 17),
  tavernStove: tile("nancysBarAssets", 0, 16),
  tavernTableLarge: tile("nancysBarAssets", 10, 13),
  tavernChairSouthTop: tile("nancysBarAssets", 10, 11),
  tavernChairSouthBottom: tile("nancysBarAssets", 10, 12),
  tavernChairEastTop: tile("nancysBarAssets", 11, 11),
  tavernChairEastBottom: tile("nancysBarAssets", 11, 12),
  tavernChairWestTop: tile("nancysBarAssets", 12, 11),
  tavernChairWestBottom: tile("nancysBarAssets", 12, 12),
  tavernChairNorthTop: tile("nancysBarAssets", 13, 11),
  tavernChairNorthBottom: tile("nancysBarAssets", 13, 12),
  tavernPlateA: tile("nancysBarAssets", 11, 13),
  tavernPlateB: tile("nancysBarAssets", 12, 13),
  tavernPlateC: tile("nancysBarAssets", 13, 13),
  tavernGlassA: tile("nancysBarAssets", 11, 14),
  tavernGlassB: tile("nancysBarAssets", 12, 14),
  tavernGlassC: tile("nancysBarAssets", 13, 14),
  tavernBarSegLeftTop: tile("nancysBarAssets", 7, 14),
  tavernBarSegLeftBottom: tile("nancysBarAssets", 7, 15),
  tavernBarSegRightTop: tile("nancysBarAssets", 14, 14),
  tavernBarSegRightBottom: tile("nancysBarAssets", 14, 15),
  tavernBarrelTopA: tile("nancysBarAssets", 14, 10),
  tavernBarrelTopB: tile("nancysBarAssets", 14, 11),
  tavernBarrelBottom: tile("nancysBarAssets", 14, 12),
  nancysBarBackWall: sprite("nancysBarAssets", 0, 0, 176, 114),
  nancysBarFurniture: sprite("nancysBarAssets", 0, 112, 223, 137),
  // Static south-facing Nancy crop from F_04.
  nancyF04South: f04Frame(0, 0),
  nancyF04Down0: f04Frame(0, 0),
  nancyF04Down1: f04Frame(0, 1),
  nancyF04Down2: f04Frame(0, 2),
  nancyF04Left0: f04Frame(2, 0),
  nancyF04Left1: f04Frame(2, 1),
  nancyF04Left2: f04Frame(2, 2),
  nancyF04Right0: f04Frame(1, 0),
  nancyF04Right1: f04Frame(1, 1),
  nancyF04Right2: f04Frame(1, 2),
  nancyF04Up0: f04Frame(3, 0),
  nancyF04Up1: f04Frame(3, 1),
  nancyF04Up2: f04Frame(3, 2),
  chickenWalkDown0: chickenWalkFrame(0, 2),
  chickenWalkDown1: chickenWalkFrame(1, 2),
  chickenWalkDown2: chickenWalkFrame(2, 2),
  chickenWalkDown3: chickenWalkFrame(3, 2),
  chickenWalkLeft0: chickenWalkFrame(0, 1),
  chickenWalkLeft1: chickenWalkFrame(1, 1),
  chickenWalkLeft2: chickenWalkFrame(2, 1),
  chickenWalkLeft3: chickenWalkFrame(3, 1),
  chickenWalkRight0: chickenWalkFrame(0, 3),
  chickenWalkRight1: chickenWalkFrame(1, 3),
  chickenWalkRight2: chickenWalkFrame(2, 3),
  chickenWalkRight3: chickenWalkFrame(3, 3),
  chickenWalkUp0: chickenWalkFrame(0, 0),
  chickenWalkUp1: chickenWalkFrame(1, 0),
  chickenWalkUp2: chickenWalkFrame(2, 0),
  chickenWalkUp3: chickenWalkFrame(3, 0),
  chickenPeck0: chickenEatFrame(0, 2),
  chickenPeck1: chickenEatFrame(1, 2),
  chickenPeck2: chickenEatFrame(2, 2),
  chickenPeck3: chickenEatFrame(3, 2),
  chicken: chickenWalkFrame(0, 2),

  // NPCs and monsters from characters.png.
  // M_05 is locked as the first Concerned Citizen.
  citizenDown0: m05Frame(0, 0),
  citizenDown1: m05Frame(0, 1),
  citizenDown2: m05Frame(0, 2),
  citizenLeft0: m05Frame(2, 0),
  citizenLeft1: m05Frame(2, 1),
  citizenLeft2: m05Frame(2, 2),
  citizenRight0: m05Frame(1, 0),
  citizenRight1: m05Frame(1, 1),
  citizenRight2: m05Frame(1, 2),
  citizenUp0: m05Frame(3, 0),
  citizenUp1: m05Frame(3, 1),
  citizenUp2: m05Frame(3, 2),
  lostPirateDown0: lostPirate.frames.lostPirateDown0,
  lostPirateDown1: lostPirate.frames.lostPirateDown1,
  lostPirateDown2: lostPirate.frames.lostPirateDown2,
  lostPirateLeft0: lostPirate.frames.lostPirateLeft0,
  lostPirateLeft1: lostPirate.frames.lostPirateLeft1,
  lostPirateLeft2: lostPirate.frames.lostPirateLeft2,
  lostPirateRight0: lostPirate.frames.lostPirateRight0,
  lostPirateRight1: lostPirate.frames.lostPirateRight1,
  lostPirateRight2: lostPirate.frames.lostPirateRight2,
  lostPirateUp0: lostPirate.frames.lostPirateUp0,
  lostPirateUp1: lostPirate.frames.lostPirateUp1,
  lostPirateUp2: lostPirate.frames.lostPirateUp2,
  nancyDown0: nancy.frames.nancyDown0,
  nancyDown1: nancy.frames.nancyDown1,
  nancyDown2: nancy.frames.nancyDown2,
  nancyLeft0: nancy.frames.nancyLeft0,
  nancyLeft1: nancy.frames.nancyLeft1,
  nancyLeft2: nancy.frames.nancyLeft2,
  nancyRight0: nancy.frames.nancyRight0,
  nancyRight1: nancy.frames.nancyRight1,
  nancyRight2: nancy.frames.nancyRight2,
  nancyUp0: nancy.frames.nancyUp0,
  nancyUp1: nancy.frames.nancyUp1,
  nancyUp2: nancy.frames.nancyUp2,
  skeletonDown0: characterFrame(10, 0),
  slimeDown0: characterFrame(1, 4),
  batDown0: characterFrame(4, 4),
  ghostDown0: characterFrame(7, 4),
  spiderDown0: characterFrame(10, 4),

  ...playableOne.frames,
  ...playableTwo.frames
};

export const CHARACTER_SETS = {
  player_one: {
    id: playableOne.id,
    name: playableOne.name,
    portrait: playableOne.portrait,
    anims: playableOne.anims
  },
  player_two: {
    id: playableTwo.id,
    name: playableTwo.name,
    portrait: playableTwo.portrait,
    anims: playableTwo.anims
  }
};

export const DEFAULT_CHARACTER = "player_one";

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
