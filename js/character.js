export const ITEM_DEFS = {
  old_spoon: {
    id: "old_spoon",
    name: "Old Spoon",
    description: "A suspiciously shiny spoon. Useless for now, but it proves inventory works."
  },
  rusty_key: {
    id: "rusty_key",
    name: "Rusty Key",
    description: "A battered key. The Concerned Citizen is looking for this."
  },
  super_shiny_key: {
    id: "super_shiny_key",
    name: "Super Shiny Key",
    description: "A very impressive key. Unfortunately, impressive does not mean useful."
  },
  rouge_mackerel: {
    id: "rouge_mackerel",
    name: "Rouge Mackerel",
    description: "A suspiciously stylish fish. It is definitely a red herring."
  },
  torch: {
    id: "torch",
    name: "Torch",
    description: "Lights a small area when held in either hand."
  },
  egg: {
    id: "egg",
    name: "Egg",
    description: "A fresh egg. Nancy buys these for tavern cooking."
  },
  wheat: {
    id: "wheat",
    name: "Wheat",
    description: "Can be sold to Nancy, or planted on grass for a bigger harvest."
  },
  barley: {
    id: "barley",
    name: "Barley",
    description: "Can be sold to Nancy, or planted on grass for a bigger harvest."
  }
};

export function createCharacterState() {
  return {
    hp: 20,
    maxHp: 20,
    gp: 0,
    resources: {
      egg: 0,
      wheat: 0,
      barley: 0
    },
    hands: {
      left: null,
      right: null
    },
    pockets: [null, null, null, null],
    openedChests: {},
    quests: {
      lostHouseKey: "not_started"
    },
    flags: {
      caveTorchIntroDone: false
    }
  };
}

export function addGold(character, amount) {
  character.gp += amount;
}

export function addResource(character, resourceId, amount = 1) {
  if (!character.resources) character.resources = {};
  character.resources[resourceId] = (character.resources[resourceId] || 0) + amount;
  return character.resources[resourceId];
}

export function hasResource(character, resourceId, amount = 1) {
  return (character.resources?.[resourceId] || 0) >= amount;
}

export function removeResource(character, resourceId, amount = 1) {
  if (!hasResource(character, resourceId, amount)) return false;
  character.resources[resourceId] -= amount;
  return true;
}

export function removeResourceBundle(character, bundle) {
  for (const [resourceId, amount] of Object.entries(bundle)) {
    if (!hasResource(character, resourceId, amount)) return false;
  }
  for (const [resourceId, amount] of Object.entries(bundle)) {
    removeResource(character, resourceId, amount);
  }
  return true;
}

export function addItemToInventory(character, itemId) {
  const item = ITEM_DEFS[itemId] || { id: itemId, name: itemId, description: "Prototype item." };
  const freeIndex = character.pockets.findIndex((slot) => slot === null);

  if (freeIndex === -1) {
    return { ok: false, reason: "Your pockets are full." };
  }

  character.pockets[freeIndex] = { ...item };
  return { ok: true, slotIndex: freeIndex, item };
}

export function hasItem(character, itemId) {
  return character.pockets.some((item) => item?.id === itemId) ||
    character.hands.left?.id === itemId ||
    character.hands.right?.id === itemId;
}

export function removeItem(character, itemId) {
  const pocketIndex = character.pockets.findIndex((item) => item?.id === itemId);
  if (pocketIndex !== -1) {
    const [item] = character.pockets.splice(pocketIndex, 1, null);
    return item;
  }

  if (character.hands.left?.id === itemId) {
    const item = character.hands.left;
    character.hands.left = null;
    return item;
  }

  if (character.hands.right?.id === itemId) {
    const item = character.hands.right;
    character.hands.right = null;
    return item;
  }

  return null;
}

export function equipPocketToHand(character, pocketIndex, preferredHand = null) {
  if (pocketIndex < 0 || pocketIndex >= character.pockets.length) {
    return { ok: false, reason: "That pocket does not exist." };
  }

  const item = character.pockets[pocketIndex];
  if (!item) return { ok: false, reason: "That pocket is empty." };

  const handKey = preferredHand || getFirstEmptyHand(character) || "left";
  const handItem = character.hands[handKey];

  character.hands[handKey] = item;
  character.pockets[pocketIndex] = handItem || null;

  return {
    ok: true,
    handKey,
    item,
    swapped: Boolean(handItem),
    reason: `${item.name} is now in your ${handKey} hand.`
  };
}

export function unequipHandToPocket(character, handKey) {
  if (handKey !== "left" && handKey !== "right") {
    return { ok: false, reason: "That hand does not exist." };
  }

  const item = character.hands[handKey];
  if (!item) return { ok: false, reason: "That hand is empty." };

  const freeIndex = character.pockets.findIndex((slot) => slot === null);
  if (freeIndex === -1) {
    return { ok: false, reason: "Your pockets are full." };
  }

  character.pockets[freeIndex] = item;
  character.hands[handKey] = null;

  return {
    ok: true,
    slotIndex: freeIndex,
    item,
    reason: `${item.name} moved back into your pockets.`
  };
}

export function isChestOpened(character, chestId) {
  return Boolean(character.openedChests[chestId]);
}

export function markChestOpened(character, chestId) {
  character.openedChests[chestId] = true;
}

export function addItemPreferHand(character, itemId) {
  const item = ITEM_DEFS[itemId] || { id: itemId, name: itemId, description: "Prototype item." };
  const emptyHand = getFirstEmptyHand(character);

  if (emptyHand) {
    character.hands[emptyHand] = { ...item };
    return { ok: true, location: emptyHand, item, reason: `${item.name} is now in your ${emptyHand} hand.` };
  }

  const pocketResult = addItemToInventory(character, itemId);
  if (!pocketResult.ok) return pocketResult;
  return { ...pocketResult, location: "pocket", reason: `${item.name} went into your pockets.` };
}

export function hasTorchEquipped(character) {
  return character.hands.left?.id === "torch" || character.hands.right?.id === "torch";
}

function getFirstEmptyHand(character) {
  if (!character.hands.left) return "left";
  if (!character.hands.right) return "right";
  return null;
}
