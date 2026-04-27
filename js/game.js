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
  isChestOpened,
  markChestOpened,
  setActiveSlot
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

    this.lootOverlay = document.getElementById("lootOverlay");
    this.lootTitle = document.getElementById("lootTitle");
    this.lootSlots = document.getElementById("lootSlots");
    this.lootMessage = document.getElementById("lootMessage");

    this.setupInventoryUi();
    this.setupLootUi();
    this.updateHud();
    this.updateStatusHud();

    this.dialogue.show(
      "Royal Britannia: Nassau Prototype v0.4. Movement is now four-direction, one-tile-at-a-time. Walk into the cave entrance to change map. Chests now use GP and pocket inventory."
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
      button.textContent = item.label || getLootLabel(item);
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
      this.renderInventory();
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
    this.renderInventory();
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
    this.renderInventory("Tap a pocket to make that item your on-hand item.");
  }

  closeInventory() {
    this.inventoryOpen = false;
    this.inventoryOverlay.classList.add("hidden");
  }

  renderInventory(message = "") {
    if (!this.inventorySlots) return;

    this.inventoryMessage.textContent = message;
    this.inventorySlots.innerHTML = "";

    this.character.inventory.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `inventorySlot${index === this.character.activeSlot ? " active" : ""}`;
      button.dataset.slotIndex = String(index);

      const label = item ? item.name : "Empty Pocket";
      const hand = index === this.character.activeSlot ? "On hand" : "Pocket";
      button.innerHTML = `<strong>${hand} ${index + 1}</strong><span>${label}</span>`;
      this.inventorySlots.appendChild(button);
    });
  }

  setupInventoryUi() {
    document.getElementById("inventoryClose")?.addEventListener("click", () => this.closeInventory());

    this.inventorySlots?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-slot-index]");
      if (!button) return;

      const slotIndex = Number(button.dataset.slotIndex);
      setActiveSlot(this.character, slotIndex);
      this.renderInventory("On-hand slot updated.");
    });
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
    this.hintText.textContent = "Move one tile at a time · tap people/objects · walk into entrances · Bag: I/B";
  }

  updateStatusHud() {
    this.hpText.textContent = `${this.character.hp}/${this.character.maxHp}`;
    this.gpText.textContent = `${this.character.gp} GP`;
  }
}

function getLootLabel(item) {
  if (item.kind === "gold") return `${item.amount || 0} GP`;
  return item.itemId || "Item";
}
