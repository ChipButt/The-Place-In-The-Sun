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
    description: "A fresh egg. Nancy buys these for tavern cooking.",
    stackable: true,
    maxStack: 5
  },
  wheat_seed: {
    id: "wheat_seed",
    name: "Wheat Seed",
    description: "Plant on grass to grow wheat.",
    stackable: true,
    maxStack: 10
  },
  barley_seed: {
    id: "barley_seed",
    name: "Barley Seed",
    description: "Plant on grass to grow barley.",
    stackable: true,
    maxStack: 10
  },
  wheat: {
    id: "wheat",
    name: "Wheat",
    description: "Harvested from wheat seeds. Nancy buys this.",
    stackable: true,
    maxStack: 10
  },
  barley: {
    id: "barley",
    name: "Barley",
    description: "Harvested from barley seeds. Nancy buys this.",
    stackable: true,
    maxStack: 10
  }
};

export function createCharacterState() {
  return {
    hp: 20,
    maxHp: 20,
    gp: 0,
    resources: {
      egg: 0,
      wheat_seed: 0,
      barley_seed: 0,
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
  const result = addStackableItemToInventory(character, resourceId, amount);
  return {
    ok: result.ok,
    added: result.added || 0,
    rejected: result.rejected || 0,
    total: getResourceCount(character, resourceId),
    reason: result.reason
  };
}

export function getResourceCount(character, resourceId) {
  let total = character.resources?.[resourceId] || 0;
  for (const slot of character.pockets || []) {
    if (slot?.id === resourceId) total += slot.qty || 1;
  }
  for (const hand of [character.hands?.left, character.hands?.right]) {
    if (hand?.id === resourceId) total += hand.qty || 1;
  }
  return total;
}

export function hasResource(character, resourceId, amount = 1) {
  return getResourceCount(character, resourceId) >= amount;
}

export function removeResource(character, resourceId, amount = 1) {
  if (!hasResource(character, resourceId, amount)) return false;
  let remaining = amount;
  const removeFromSlot = (slot) => {
    if (!slot || slot.id !== resourceId || remaining <= 0) return slot;
    const qty = slot.qty || 1;
    const taken = Math.min(qty, remaining);
    remaining -= taken;
    const left = qty - taken;
    if (left <= 0) return null;
    return { ...slot, qty: left };
  };
  for (let i = 0; i < character.pockets.length && remaining > 0; i++) {
    character.pockets[i] = removeFromSlot(character.pockets[i]);
  }
  if (remaining > 0) character.hands.left = removeFromSlot(character.hands.left);
  if (remaining > 0) character.hands.right = removeFromSlot(character.hands.right);
  if (remaining > 0 && character.resources?.[resourceId]) {
    const taken = Math.min(character.resources[resourceId], remaining);
    character.resources[resourceId] -= taken;
    remaining -= taken;
  }
  return remaining <= 0;
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
  if (item.stackable) return addStackableItemToInventory(character, itemId, 1);
  const freeIndex = character.pockets.findIndex((slot) => slot === null);
  if (freeIndex === -1) {
    return { ok: false, reason: "Your pockets are full." };
  }
  character.pockets[freeIndex] = { ...item };
  return { ok: true, slotIndex: freeIndex, item };
}

export function addStackableItemToInventory(character, itemId, amount = 1) {
  const def = ITEM_DEFS[itemId] || { id: itemId, name: itemId, description: "Prototype item.", stackable: true, maxStack: 10 };
  const maxStack = def.maxStack || 10;
  let remaining = amount;
  let addedTotal = 0;

  const handSlots = character.hands ? [character.hands.left, character.hands.right] : [];
  const pocketSlots = character.pockets || [];

  // Fill existing stacks first, including hand slots.
  for (const slot of [...handSlots, ...pocketSlots]) {
    if (slot?.id !== itemId) continue;
    const current = slot.qty || 1;
    const space = maxStack - current;
    if (space <= 0) continue;
    const add = Math.min(space, remaining);
    slot.qty = current + add;
    remaining -= add;
    addedTotal += add;
    if (remaining <= 0) {
      return { ok: true, added: addedTotal, rejected: 0, item: { ...def, qty: addedTotal }, reason: `Added ${addedTotal} ${def.name}.` };
    }
  }

  // New stacks go into empty hands first, then empty pockets.
  for (const handKey of ["left", "right"]) {
    if (!character.hands || character.hands[handKey]) continue;
    const add = Math.min(maxStack, remaining);
    character.hands[handKey] = { ...def, qty: add };
    remaining -= add;
    addedTotal += add;
    if (remaining <= 0) {
      return { ok: true, added: addedTotal, rejected: 0, item: { ...def, qty: addedTotal }, reason: `Added ${addedTotal} ${def.name}.` };
    }
  }

  while (remaining > 0) {
    const freeIndex = character.pockets.findIndex((slot) => slot === null);
    if (freeIndex === -1) {
      return {
        ok: addedTotal > 0,
        added: addedTotal,
        rejected: remaining,
        item: addedTotal > 0 ? { ...def, qty: addedTotal } : null,
        reason: addedTotal > 0 ? `Added ${addedTotal} ${def.name}. No room for ${remaining}.` : "Your inventory is full."
      };
    }

    const add = Math.min(maxStack, remaining);
    character.pockets[freeIndex] = { ...def, qty: add };
    remaining -= add;
    addedTotal += add;
  }

  return { ok: true, added: addedTotal, rejected: 0, item: { ...def, qty: addedTotal }, reason: `Added ${addedTotal} ${def.name}.` };
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
