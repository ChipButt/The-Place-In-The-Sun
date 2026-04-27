import { MAPS, getSpawnForMap } from "./maps.js";
import { createInput } from "./input.js";
import { createPlayer, setPlayerCharacter, setPlayerSpawn, updatePlayer } from "./player.js";
import { findInteraction, findInteractionAtWorldPoint, findPortal } from "./interactions.js";
import { createDialogue } from "./dialogue.js";
import { createRenderer } from "./renderer.js";
import {
  addGold,
  addItemToInventory,
  createCharacterState,
  equipPocketToHand,
  hasItem,
  isChestOpened,
  markChestOpened,
  removeItem,
  unequipHandToPocket
} from "./character.js";

const CONCERNED_CITIZEN_REWARD_GP = 40;

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
    this.characterSelected = false;

    this.lastTime = performance.now();
    this.running = false;

    this.locationName = document.getElementById("locationName");
    this.hintText = document.getElementById("hintText");
    this.hpText = document.getElementById("hpText");
    this.gpText = document.getElementById("gpText");

    this.startScreen = document.getElementById("startScreen");
    this.loadingText = document.getElementById("loadingText");

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

    this.setupCharacterSelectUi();
    this.setupInventoryUi();
    this.setupLootUi();
    this.updateHud();
    this.updateStatusHud();
    this.renderAllInventoryViews();

    if (this.loadingText) this.loadingText.textContent = "Choose your buccaneer.";
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
    this.updateNpcScripts(dt);

    if (!this.characterSelected) return;

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

  setupCharacterSelectUi() {
    const buttons = document.querySelectorAll("[data-character-key]");
    for (const button of buttons) {
      button.addEventListener("click", () => this.selectCharacter(button.dataset.characterKey));
    }
  }

  selectCharacter(characterKey) {
    setPlayerCharacter(this.player, characterKey);
    this.characterSelected = true;
    this.startScreen?.classList.add("hidden");
    this.dialogue.show(
      "Welcome to Nassau. Move one tile at a time, use the centre D-pad button to act, and walk directly into glowing entrance tiles to change map."
    );
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

    if (interaction.type === "quest") {
      this.handleQuest(interaction);
      return;
    }

    this.dialogue.show("Nothing happens yet.");
  }

  handleQuest(interaction) {
    if (interaction.questId !== "lost_house_key") {
      this.dialogue.show("That quest is not wired in yet.");
      return;
    }

    const questState = this.character.quests.lostHouseKey;

    if (questState === "complete") {
      this.dialogue.show("Concerned Citizen: Thanks again for finding my key. I can finally stop standing around looking worried.");
      return;
    }

    if (hasItem(this.character, "rusty_key")) {
      removeItem(this.character, "rusty_key");
      addGold(this.character, CONCERNED_CITIZEN_REWARD_GP);
      this.character.quests.lostHouseKey = "complete";
      this.renderAllInventoryViews("Rusty Key handed over.");
      this.updateStatusHud();
      this.startConcernedCitizenReturnHome();
      this.dialogue.show(
        `Concerned Citizen: That's it! That's my key! Thank you. Please take ${CONCERNED_CITIZEN_REWARD_GP} GP for your trouble.`
      );
      return;
    }

    this.character.quests.lostHouseKey = "started";
    this.dialogue.show(
      "Concerned Citizen: I've lost the key to my house. If only someone could find it, I'd be more than happy to reward them. I think I last had it near the cave."
    );
  }

  startConcernedCitizenReturnHome() {
    const npc = MAPS.nassau.npcs.find((entry) => entry.id === "concernedCitizen");
    if (!npc || npc.hidden) return;

    npc.script = "returning_home";
    npc.speed = 2.2;
    npc.path = [
      { x: 22.0, y: 12.0 },
      { x: 23.5, y: 11.0 },
      { x: 25.5, y: 10.0 },
      { x: 27.4, y: 9.3 },
      { x: 29.2, y: 8.9 }
    ];
    npc.pathIndex = 0;
    npc.scriptDelay = 0.8;
    npc.interaction = null;
    npc.dialogue = "Thank you again. I'm heading home now.";
  }

  updateNpcScripts(dt) {
    for (const map of Object.values(MAPS)) {
      for (const npc of map.npcs || []) {
        if (npc.hidden || npc.script !== "returning_home") continue;
        moveNpcAlongPath(npc, dt);
      }
    }
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

function moveNpcAlongPath(npc, dt) {
  if (npc.scriptDelay > 0) {
    npc.scriptDelay -= dt;
    return;
  }

  if (!npc.path || npc.pathIndex >= npc.path.length) {
    npc.hidden = true;
    npc.script = null;
    return;
  }

  const target = npc.path[npc.pathIndex];
  const dx = target.x - npc.x;
  const dy = target.y - npc.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.04) {
    npc.x = target.x;
    npc.y = target.y;
    npc.pathIndex++;
    if (npc.pathIndex >= npc.path.length) {
      npc.hidden = true;
      npc.script = null;
    }
    return;
  }

  const speed = npc.speed || 2;
  const step = Math.min(distance, speed * dt);
  npc.x += (dx / distance) * step;
  npc.y += (dy / distance) * step;

  if (Math.abs(dx) > Math.abs(dy)) {
    npc.direction = dx > 0 ? "right" : "left";
  } else {
    npc.direction = dy > 0 ? "down" : "up";
  }

  const standingSprites = {
    down: "citizenDown0",
    up: "citizenUp0",
    left: "citizenLeft0",
    right: "citizenRight0"
  };
  npc.sprite = standingSprites[npc.direction] || "citizenDown0";
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
