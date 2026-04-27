import { MAPS, getSpawnForMap } from "./maps.js";
import { createInput } from "./input.js";
import { createPlayer, setPlayerSpawn, updatePlayer } from "./player.js";
import { findInteraction, findInteractionAtWorldPoint, findPortal } from "./interactions.js";
import { createDialogue } from "./dialogue.js";
import { createRenderer } from "./renderer.js";
import {
  addGold,
  addItemToInventory,
  createCharacterState,
  equipPocketToHand,
  isChestOpened,
  markChestOpened,
  unequipHandToPocket
} from "./character.js";

export class Game {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.images = images;
    this.input = createInput(canvas);
    this.dialogue = createDialogue();
    this.renderer = createRenderer(canvas, images);

    this.currentMap = MAPS.nassau;
    this.player = createPlayer(getSpawnForMap(this.currentMap));
    this.character = createCharacterState();

    this.portalCooldown = 0;
    this.chestStates = {};
    this.lootContext = null;
    this.inventoryOpen = false;

    this.lastTime = performance.now();
    this.running = false;

    this.locationName = document.getElementById("locationName");
    this.hintText = document.getElementById("hintText");
    this.hpText = document.getElementById("hpText");
    this.gpText = document.getElementById("gpText");

    this.inventoryOverlay = document.getElementById("inventoryOverlay");
    this.inventorySlots = document.getElementById("inventorySlots");
    this.inventoryMessage = document.getElementById("inventoryMessage");

    this.handSlots = document.getElementById("handSlots");
    this.pocketSlots = document.getElementById("pocketSlots");
    this.quickInventoryMessage = document.getElementById("quickInventoryMessage");

    this.lootOverlay = document.getElementById("lootOverlay");
    this.lootTitle = document.getElementById("lootTitle");
    this.lootSlots = document.getElementById("lootSlots");
    this.lootMessage = document.getElementById("lootMessage");

    this.setupInventoryUi();
    this.setupLootUi();
    this.updateHud();
    this.updateStatusHud();
    this.renderAllInventoryViews();

    this.dialogue.show(
      "Royal Britannia: Nassau Prototype v0.5. The centre of the D-pad is now Action. Your hands and pockets are visible in the right panel, and the cave entrance has been moved onto a walkable tile."
    );
  }

  start() {
    this.running = true;
    requestAnimationFrame((time) => this.loop(time));
  }

  loop(time) {
    if (!this.running) return;

    const dt = Math.min(0.033, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this.update(dt);
    this.renderer.draw(this.currentMap, this.player);

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    if (this.portalCooldown > 0) this.portalCooldown -= dt;

    if (this.input.consumeInventory()) {
      this.toggleInventory();
      return;
    }

    const tap = this.input.consumeTap();
    if (tap) {
      if (this.dialogue.active) {
        this.dialogue.close();
        return;
      }

      if (this.isUiBlockingMovement()) return;

      const worldPoint = this.renderer.screenToWorld(tap.x, tap.y);
      const tappedInteraction = findInteractionAtWorldPoint(this.currentMap, worldPoint.x, worldPoint.y);
      if (tappedInteraction) {
        this.handleInteraction(tappedInteraction);
        return;
      }
    }

    if (this.input.consumeInteract()) {
      if (this.dialogue.active) {
        this.dialogue.close();
        return;
      }

      if (this.isUiBlockingMovement()) return;

      const interaction = findInteraction(this.currentMap, this.player);
      if (interaction) {
        this.handleInteraction(interaction);
        return;
      }
    }

    if (this.dialogue.active || this.isUiBlockingMovement()) return;

    updatePlayer(this.player, this.currentMap, this.input.state, dt);

    if (this.portalCooldown <= 0 && !this.player.stepping) {
      const portal = findPortal(this.currentMap, this.player);
      if (portal) this.changeMap(portal.targetMap, portal.targetSpawn);
    }
  }

  handleInteraction(interaction) {
    if (interaction.type === "dialogue") {
      this.dialogue.show(interaction.text);
      return;
    }

    if (interaction.type === "chest") {
      this.openChest(interaction);
      return;
    }

    this.dialogue.show("Nothing happens yet.");
  }

  openChest(chestInteraction) {
    if (isChestOpened(this.character, chestInteraction.chestId)) {
      this.dialogue.show(chestInteraction.emptyText || "This chest is empty.");
      return;
    }

    if (!this.chestStates[chestInteraction.chestId]) {
      this.chestStates[chestInteraction.chestId] = chestInteraction.loot.map((item, index) => ({
        ...item,
        index,
        taken: false
      }));
    }

    this.lootContext = {
      chestId: chestInteraction.chestId,
      title: chestInteraction.title || "Chest",
      items: this.chestStates[chestInteraction.chestId]
    };

    this.dialogue.close();
    this.inventoryOpen = false;
    this.inventoryOverlay.classList.add("hidden");
    this.lootOverlay.classList.remove("hidden");
    this.renderLoot();
  }

  renderLoot(message = "Tap an item to take it, or use Take All.") {
    if (!this.lootContext) return;

    this.lootTitle.textContent = this.lootContext.title;
    this.lootMessage.textContent = message;
    this.lootSlots.innerHTML = "";

    const available = this.lootContext.items.filter((item) => !item.taken);

    if (available.length === 0) {
      this.lootSlots.innerHTML = `<div class="emptySlot">Empty</div>`;
      markChestOpened(this.character, this.lootContext.chestId);
      this.updateStatusHud();
      return;
    }

    for (const item of this.lootContext.items) {
      if (item.taken) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lootSlot";
      button.dataset.lootIndex = String(item.index);
      button.innerHTML = `<strong>${item.label || getLootLabel(item)}</strong><span>${item.kind === "gold" ? "Currency" : "Item"}</span>`;
      this.lootSlots.appendChild(button);
    }
  }

  takeLootItem(index) {
    if (!this.lootContext) return;
    const item = this.lootContext.items.find((entry) => entry.index === index);
    if (!item || item.taken) return;

    if (item.kind === "gold") {
      addGold(this.character, item.amount || 0);
      item.taken = true;
      this.updateStatusHud();
      this.renderLoot(`Took ${item.amount || 0} GP.`);
      this.checkChestComplete();
      return;
    }

    if (item.kind === "item") {
      const result = addItemToInventory(this.character, item.itemId);
      if (!result.ok) {
        this.renderLoot(result.reason);
        return;
      }

      item.taken = true;
      this.updateStatusHud();
      this.renderAllInventoryViews(`${result.item.name} went into your pockets.`);
      this.renderLoot(`Took ${result.item.name}.`);
      this.checkChestComplete();
      return;
    }
  }

  takeAllLoot() {
    if (!this.lootContext) return;

    let takenCount = 0;
    let blocked = false;

    for (const item of this.lootContext.items) {
      if (item.taken) continue;

      if (item.kind === "gold") {
        addGold(this.character, item.amount || 0);
        item.taken = true;
        takenCount++;
        continue;
      }

      if (item.kind === "item") {
        const result = addItemToInventory(this.character, item.itemId);
        if (!result.ok) {
          blocked = true;
          continue;
        }
        item.taken = true;
        takenCount++;
      }
    }

    this.updateStatusHud();
    this.renderAllInventoryViews();
    this.renderLoot(blocked ? "Your pockets are full. Some items were left behind." : `Took ${takenCount} item${takenCount === 1 ? "" : "s"}.`);
    this.checkChestComplete();
  }

  checkChestComplete() {
    if (!this.lootContext) return;
    const allTaken = this.lootContext.items.every((item) => item.taken);
    if (allTaken) markChestOpened(this.character, this.lootContext.chestId);
  }

  closeLoot() {
    this.lootOverlay.classList.add("hidden");
    this.lootContext = null;
  }

  toggleInventory() {
    if (this.lootContext) return;
    if (this.inventoryOpen) this.closeInventory();
    else this.openInventory();
  }

  openInventory() {
    this.dialogue.close();
    this.inventoryOpen = true;
    this.inventoryOverlay.classList.remove("hidden");
    this.renderInventory("Desktop inventory view. On mobile, use the right panel.");
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.inventoryOverlay.classList.add("hidden");
  }

  renderAllInventoryViews(message = "") {
    this.renderQuickInventory(message);
    this.renderInventory(message);
  }

  renderQuickInventory(message = "") {
    if (this.quickInventoryMessage && message) this.quickInventoryMessage.textContent = message;
    if (!this.handSlots || !this.pocketSlots) return;

    this.handSlots.innerHTML = "";
    this.pocketSlots.innerHTML = "";

    this.handSlots.appendChild(createInventoryButton({
      type: "hand",
      key: "left",
      label: "Left",
      item: this.character.hands.left
    }));

    this.handSlots.appendChild(createInventoryButton({
      type: "hand",
      key: "right",
      label: "Right",
      item: this.character.hands.right
    }));

    this.character.pockets.forEach((item, index) => {
      this.pocketSlots.appendChild(createInventoryButton({
        type: "pocket",
        key: String(index),
        label: `P${index + 1}`,
        item
      }));
    });
  }

  renderInventory(message = "") {
    if (!this.inventorySlots || !this.inventoryMessage) return;

    this.inventoryMessage.textContent = message;
    this.inventorySlots.innerHTML = "";

    this.inventorySlots.appendChild(createInventoryButton({
      type: "hand",
      key: "left",
      label: "Left Hand",
      item: this.character.hands.left,
      overlay: true
    }));

    this.inventorySlots.appendChild(createInventoryButton({
      type: "hand",
      key: "right",
      label: "Right Hand",
      item: this.character.hands.right,
      overlay: true
    }));

    this.character.pockets.forEach((item, index) => {
      this.inventorySlots.appendChild(createInventoryButton({
        type: "pocket",
        key: String(index),
        label: `Pocket ${index + 1}`,
        item,
        overlay: true
      }));
    });
  }

  setupInventoryUi() {
    document.getElementById("inventoryClose")?.addEventListener("click", () => this.closeInventory());

    const handleClick = (event) => {
      const handButton = event.target.closest("[data-hand-key]");
      if (handButton) {
        const result = unequipHandToPocket(this.character, handButton.dataset.handKey);
        this.renderAllInventoryViews(result.reason);
        return;
      }

      const pocketButton = event.target.closest("[data-pocket-index]");
      if (pocketButton) {
        const result = equipPocketToHand(this.character, Number(pocketButton.dataset.pocketIndex));
        this.renderAllInventoryViews(result.reason);
      }
    };

    this.inventorySlots?.addEventListener("click", handleClick);
    this.handSlots?.addEventListener("click", handleClick);
    this.pocketSlots?.addEventListener("click", handleClick);
  }

  setupLootUi() {
    document.getElementById("lootClose")?.addEventListener("click", () => this.closeLoot());
    document.getElementById("lootTakeAll")?.addEventListener("click", () => this.takeAllLoot());

    this.lootSlots?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-loot-index]");
      if (!button) return;
      this.takeLootItem(Number(button.dataset.lootIndex));
    });
  }

  isUiBlockingMovement() {
    return this.inventoryOpen || Boolean(this.lootContext);
  }

  changeMap(mapId, spawnName) {
    const targetMap = MAPS[mapId];

    if (!targetMap) {
      this.dialogue.show(`Map "${mapId}" does not exist yet.`);
      return;
    }

    this.currentMap = targetMap;
    setPlayerSpawn(this.player, getSpawnForMap(targetMap, spawnName));
    this.portalCooldown = 0.55;
    this.updateHud();
  }

  updateHud() {
    this.locationName.textContent = this.currentMap.name;
    this.hintText.textContent = "Move one tile at a time · centre D-pad button interacts · walk into entrances";
  }

  updateStatusHud() {
    this.hpText.textContent = `${this.character.hp}/${this.character.maxHp}`;
    this.gpText.textContent = `${this.character.gp} GP`;
    this.renderQuickInventory();
  }
}

function createInventoryButton({ type, key, label, item, overlay = false }) {
  const button = document.createElement("button");
  button.type = "button";

  if (type === "hand") {
    button.dataset.handKey = key;
  } else {
    button.dataset.pocketIndex = key;
  }

  const filled = Boolean(item);
  const baseClass = overlay ? "inventorySlot" : "quickSlot";
  const filledClass = filled ? (type === "hand" ? "handFilled" : "pocketFilled") : "empty";
  button.className = `${baseClass} ${filledClass}`;
  button.innerHTML = `<strong>${label}</strong><span>${item ? item.name : "Empty"}</span>`;
  return button;
}

function getLootLabel(item) {
  if (item.kind === "gold") return `${item.amount || 0} GP`;
  return item.itemId || "Item";
}
