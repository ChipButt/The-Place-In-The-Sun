export const IMAGE_PATHS = {
  basictiles: "assets/images/sheets/basictiles.png",
  characters: "assets/images/sheets/characters.png",
  things: "assets/images/sheets/things.png",
  dead: "assets/images/sheets/dead.png",
  fontlarge: "assets/images/sheets/fontlarge.png",
  fontsmall1: "assets/images/sheets/fontsmall1.gif",
  fontsmall2: "assets/images/sheets/fontsmall2.gif"
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
  palmTree: tile("basictiles", 4, 14),
  bush: tile("basictiles", 4, 8),
  rock: tile("basictiles", 2, 7),
  stump: tile("basictiles", 4, 3),
  campfire: tile("basictiles", 4, 7),
  // Barrel/crate placeholder now uses the pot tile: 4 down / 4 across -> col 3, row 3.
  crate: tile("basictiles", 3, 3),
  barrel: tile("basictiles", 3, 3),
  chest: tile("things", 6, 0),
  chestOpen: tile("things", 6, 1),
  boat: tile("basictiles", 3, 6),
  houseDoor: tile("basictiles", 0, 6),
  houseWall: tile("basictiles", 1, 9),
  houseFloor: tile("basictiles", 0, 1),
  houseWindow: tile("basictiles", 1, 10),
  caveRockBlock: tile("basictiles", 7, 1),
  caveEntranceTile: tile("basictiles", 2, 6),

  // NPCs and monsters from characters.png.
  citizenDown0: citizen.frames.citizenDown0,
  citizenDown1: citizen.frames.citizenDown1,
  citizenDown2: citizen.frames.citizenDown2,
  citizenLeft0: citizen.frames.citizenLeft0,
  citizenLeft1: citizen.frames.citizenLeft1,
  citizenLeft2: citizen.frames.citizenLeft2,
  citizenRight0: citizen.frames.citizenRight0,
  citizenRight1: citizen.frames.citizenRight1,
  citizenRight2: citizen.frames.citizenRight2,
  citizenUp0: citizen.frames.citizenUp0,
  citizenUp1: citizen.frames.citizenUp1,
  citizenUp2: citizen.frames.citizenUp2,
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
