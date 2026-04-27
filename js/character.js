export const ITEM_DEFS = {
  old_spoon: {
    id: "old_spoon",
    name: "Old Spoon",
    description: "A suspiciously shiny spoon. Useless for now, but it proves inventory works."
  },
  rusty_key: {
    id: "rusty_key",
    name: "Rusty Key",
    description: "A battered key. Later this can unlock a door, chest, or quest path."
  }
};

export function createCharacterState() {
  return {
    hp: 20,
    maxHp: 20,
    gp: 0,
    inventory: [null, null, null, null, null],
    activeSlot: 0,
    openedChests: {}
  };
}

export function addGold(character, amount) {
  character.gp += amount;
}

export function addItemToInventory(character, itemId) {
  const item = ITEM_DEFS[itemId] || { id: itemId, name: itemId, description: "Prototype item." };
  const freeIndex = character.inventory.findIndex((slot) => slot === null);

  if (freeIndex === -1) {
    return { ok: false, reason: "Your pockets are full." };
  }

  character.inventory[freeIndex] = { ...item };
  return { ok: true, slotIndex: freeIndex, item };
}

export function setActiveSlot(character, slotIndex) {
  if (slotIndex < 0 || slotIndex >= character.inventory.length) return;
  character.activeSlot = slotIndex;
}

export function isChestOpened(character, chestId) {
  return Boolean(character.openedChests[chestId]);
}

export function markChestOpened(character, chestId) {
  character.openedChests[chestId] = true;
}
