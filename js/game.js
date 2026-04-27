import { TILE_SIZE, PLAYER } from "./config.js";
import { MAPS, getSpawnForMap } from "./maps.js";
import { createInput } from "./input.js";
import { createPlayer, setPlayerCharacter, setPlayerSpawn, updatePlayer } from "./player.js";
import { findInteraction, findPortal } from "./interactions.js";
import { createDialogue } from "./dialogue.js";
import { createRenderer } from "./renderer.js";
import { clearGameSave, hasSavedGame, loadGameSave, writeGameSave } from "./save.js";
import {
  addGold,
  addResource,
  removeResource,
  removeResourceBundle,
  hasResource,
  getResourceCount,
  addItemPreferHand,
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
const NPC_STEP_DURATION = 0.22;
const CHICKEN_SEQUENCE_SECONDS = 5;
const CHICKEN_WALK_STEP_SECONDS = 0.62;
const CHICKEN_FULL_EGG_CYCLE_SECONDS = 150;
const CHICKEN_MAX_AWAY_EGGS = 3;
const CROP_TOTAL_GROW_SECONDS = CHICKEN_FULL_EGG_CYCLE_SECONDS;
const CROP_STAGE_SECONDS = 30;

export class Game {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.images = images;
    this.input = createInput(canvas);
    this.dialogue = createDialogue(() => this.afterDialogueClosed());
    this.renderer = createRenderer(canvas, images);

    this.currentMap = MAPS.nassau;
    this.player = createPlayer(getSpawnForMap(this.currentMap));
    this.character = createCharacterState();

    this.portalCooldown = 0;
    this.chestStates = {};
    this.lootContext = null;
    this.inventoryOpen = false;
    this.pendingPlantTile = null;
    this.characterSelected = false;
    this.pendingAfterDialogue = null;
    this.autoSaveTimer = 0;
    this.saveMessageTimer = 0;
    this.toastTimer = 0;
    this.toastElement = null;

    this.lastTime = performance.now();
    this.running = false;

    this.locationName = document.getElementById("locationName");
    this.hintText = document.getElementById("hintText");
    this.hpText = document.getElementById("hpText");
    this.gpText = document.getElementById("gpText");
    this.eggText = document.getElementById("eggText");
    this.wheatText = document.getElementById("wheatText");
    this.barleyText = document.getElementById("barleyText");
    this.lastFlowerFindKey = null;
        this.leftNassauAt = null;

    this.startScreen = document.getElementById("startScreen");
    this.loadingText = document.getElementById("loadingText");
    this.startMenu = document.getElementById("startMenu");
    this.characterChoices = document.getElementById("characterChoices");
    this.newGameButton = document.getElementById("newGameButton");
    this.loadGameButton = document.getElementById("loadGameButton");
    this.saveStatusText = document.getElementById("saveStatusText");

    this.inventoryOverlay = document.getElementById("inventoryOverlay");
    this.inventorySlots = document.getElementById("inventorySlots");
    this.inventoryMessage = document.getElementById("inventoryMessage");

    this.handSlots = document.getElementById("handSlots");
    this.pocketSlots = document.getElementById("pocketSlots");
    this.quickInventoryMessage = document.getElementById("quickInventoryMessage");

    this.plantOverlay = document.getElementById("plantOverlay");
    this.plantOptions = document.getElementById("plantOptions");
    this.plantMessage = document.getElementById("plantMessage");
    this.plantClose = document.getElementById("plantClose");

    this.tradeOverlay = document.getElementById("tradeOverlay");
    this.tradeOptions = document.getElementById("tradeOptions");
    this.tradeMessage = document.getElementById("tradeMessage");
    this.tradeClose = document.getElementById("tradeClose");

    this.lootOverlay = document.getElementById("lootOverlay");
    this.lootTitle = document.getElementById("lootTitle");
    this.lootSlots = document.getElementById("lootSlots");
    this.lootMessage = document.getElementById("lootMessage");

    this.setupCharacterSelectUi();
    this.setupInventoryUi();
    this.setupLootUi();
    this.setupPlantUi();
    this.setupTradeUi();
    this.updateHud();
    this.updateStatusHud();
    this.renderAllInventoryViews();

    if (this.loadingText) this.loadingText.textContent = "Choose your buccaneer.";

    window.addEventListener("beforeunload", () => this.saveGame());
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
    this.syncOpenedChestSprites();
    this.renderer.draw(this.currentMap, this.player, this.character);

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    if (!this.characterSelected) return;

    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 2.5) {
      this.autoSaveTimer = 0;
      this.saveGame(false);
    }

    if (this.saveMessageTimer > 0) this.saveMessageTimer -= dt;
    this.updateToast(dt);
    this.updateNpcScripts(dt);
    this.updateFarmingObjects(dt);

    if (this.portalCooldown > 0) this.portalCooldown -= dt;

    if (this.input.consumeInventory()) {
      this.toggleInventory();
      return;
    }

    // Canvas tap-to-interact is deliberately disabled. Mobile play now uses
    // only the centre ACT button, so chests/NPCs cannot be used from across the map.
    this.input.consumeTap();

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

      if (this.tryPlantCrop()) return;
    }

    if (this.dialogue.active || this.isUiBlockingMovement()) return;

    const wasStepping = this.player.stepping;
    updatePlayer(this.player, this.currentMap, this.input.state, dt);
    if (wasStepping && !this.player.stepping) this.checkFlowerForage();

    if (!this.player.stepping && this.checkForcedCaveIntro()) return;

    if (this.portalCooldown <= 0 && !this.player.stepping) {
      const portal = findPortal(this.currentMap, this.player);
      if (portal) this.changeMap(portal.targetMap, portal.targetSpawn);
    }
  }

  setupCharacterSelectUi() {
    const hasSave = hasSavedGame();
    this.characterChoices?.classList.add("hidden");
    if (this.loadGameButton) this.loadGameButton.disabled = !hasSave;
    if (this.loadingText) this.loadingText.textContent = hasSave ? "Load your save, or start afresh." : "Start a new adventure.";

    this.newGameButton?.addEventListener("click", () => this.prepareNewGame());
    this.loadGameButton?.addEventListener("click", () => this.loadSavedGame());

    const buttons = document.querySelectorAll("[data-character-key]");
    for (const button of buttons) {
      button.addEventListener("click", () => this.selectCharacter(button.dataset.characterKey));
    }
  }

  prepareNewGame() {
    if (hasSavedGame()) {
      const confirmed = window.confirm("Warning: starting a new game will erase your current save. Is that what you want?");
      if (!confirmed) return;
      clearGameSave();
    }

    this.startMenu?.classList.add("hidden");
    this.characterChoices?.classList.remove("hidden");
    if (this.loadingText) this.loadingText.textContent = "Choose your buccaneer.";
  }

  selectCharacter(characterKey) {
    setPlayerCharacter(this.player, characterKey);
    this.characterSelected = true;
    this.startScreen?.classList.add("hidden");
    this.saveGame(true);
  }

  loadSavedGame() {
    const save = loadGameSave();
    if (!save) {
      if (this.loadingText) this.loadingText.textContent = "No save found on this device.";
      return;
    }

    this.applySaveData(save);
    this.characterSelected = true;
    this.startScreen?.classList.add("hidden");
    this.saveGame(false);
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

    if (interaction.type === "nancy") {
      this.handleNancy();
      return;
    }

    if (interaction.type === "collect_resource") {
      this.collectResourceObject(interaction.objectId, interaction.resourceId, interaction.amount || 1);
      return;
    }

    if (interaction.type === "harvest_crop") {
      this.harvestCrop(interaction.objectId);
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

    if (!hasItem(this.character, "rusty_key") && hasItem(this.character, "super_shiny_key")) {
      this.character.quests.lostHouseKey = "started";
      this.dialogue.show(
        "Concerned Citizen: That's not my key. I need a different key. But it looks nice."
      );
      return;
    }

    if (hasItem(this.character, "rusty_key")) {
      removeItem(this.character, "rusty_key");
      addGold(this.character, CONCERNED_CITIZEN_REWARD_GP);
      this.character.quests.lostHouseKey = "complete";
      this.renderAllInventoryViews("Rusty Key handed over.");
      this.updateStatusHud();
      this.pendingAfterDialogue = "concernedCitizenReturnHome";
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

  afterDialogueClosed() {
    const action = this.pendingAfterDialogue;
    this.pendingAfterDialogue = null;

    if (action === "torchGiverLeave") {
      this.startTorchGiverLeave();
      return;
    }

    if (action === "concernedCitizenReturnHome") {
      this.startConcernedCitizenReturnHome();
    }
  }

  startConcernedCitizenReturnHome() {
    const npc = MAPS.nassau.npcs.find((entry) => entry.id === "concernedCitizen");
    if (!npc || npc.hidden) return;

    npc.script = "returning_home";
    npc.speed = 1;
    npc.path = [
      { x: 20, y: 13 },
      { x: 18, y: 14 },
      { x: 16, y: 15 },
      { x: 14, y: 16 },
      { x: 12, y: 17 },
      { x: 10, y: 18 },
      { x: 10, y: 19 },
      { x: 10, y: 20 }
    ];
    npc.pathIndex = 0;
    npc.scriptDelay = 0.15;
    npc.interaction = null;
    npc.dialogue = "Thank you again. I'm heading home now.";
  }

  updateNpcScripts(dt) {
    for (const map of Object.values(MAPS)) {
      for (const npc of map.npcs || []) {
        if (npc.hidden) continue;
        if (npc.script === "chicken_roam") {
          if (this.currentMap.id === "nassau" && map.id === "nassau") this.updateChicken(npc, map, dt);
          continue;
        }
        if (npc.script !== "returning_home" && npc.script !== "leaving_cave") continue;
        moveNpcAlongPath(npc, dt);
      }
    }
  }

  checkForcedCaveIntro() {
    if (this.currentMap.id !== "cave01") return false;
    if (this.character.flags.caveTorchIntroDone) return false;

    const tile = getPlayerTile(this.player);
    if (tile.y > 18) return false;

    this.character.flags.caveTorchIntroDone = true;

    const torchResult = addItemPreferHand(this.character, "torch");
    this.renderAllInventoryViews(torchResult.reason || "Torch added.");
    this.pendingAfterDialogue = "torchGiverLeave";

    this.dialogue.show(
      "Old Lost Pirate: It's too dark in here without a torch. I've finally found my way out, and it took me ages to craft this one, but you definitely need it more than I do. Take it, and good luck."
    );

    return true;
  }

  startTorchGiverLeave() {
    const npc = MAPS.cave01.npcs.find((entry) => entry.id === "torchGiver");
    if (!npc || npc.hidden) return;

    npc.script = "leaving_cave";
    npc.speed = 1;
    npc.path = [
      { x: 14, y: 17 },
      { x: 14, y: 18 },
      { x: 14, y: 19 },
      { x: 14, y: 20 },
      { x: 13, y: 20 }
    ];
    npc.pathIndex = 0;
    npc.scriptDelay = 0.05;
    npc.interaction = null;
    npc.dialogue = "I'm getting out of here while I still can.";
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
      markChestOpened(this.character, this.lootContext.chestId);
      this.syncOpenedChestSprites();
      this.updateStatusHud();
      this.closeLoot();
      return;
    }

    for (const item of available) {
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
      this.checkChestComplete();
      this.renderLoot(`Took ${item.amount || 0} GP.`);
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
      this.checkChestComplete();
      this.renderLoot(`Took ${result.item.name}.`);
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
    this.checkChestComplete();
    this.renderLoot(blocked ? "Your pockets are full. Some items were left behind." : `Took ${takenCount} item${takenCount === 1 ? "" : "s"}.`);
  }

  checkChestComplete() {
    if (!this.lootContext) return;
    const allTaken = this.lootContext.items.every((item) => item.taken);
    if (allTaken) {
      markChestOpened(this.character, this.lootContext.chestId);
      this.syncOpenedChestSprites();
    }
  }

  syncOpenedChestSprites() {
    for (const map of Object.values(MAPS)) {
      for (const object of map.objects || []) {
        if (object.interaction?.type !== "chest") continue;
        const opened = isChestOpened(this.character, object.interaction.chestId);
        object.sprite = opened ? "chestOpen" : "chest";
      }
    }
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
        label: "",
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
        label: "Pocket",
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
    const closeButton = document.getElementById("lootClose");
    const takeAllButton = document.getElementById("lootTakeAll");

    const closeLoot = (event) => {
      event?.preventDefault?.();
      this.closeLoot();
    };

    const takeAll = (event) => {
      event?.preventDefault?.();
      this.takeAllLoot();
    };

    closeButton?.addEventListener("pointerup", closeLoot, { passive: false });
    closeButton?.addEventListener("click", closeLoot);
    takeAllButton?.addEventListener("pointerup", takeAll, { passive: false });
    takeAllButton?.addEventListener("click", takeAll);

    const takeSingle = (event) => {
      const button = event.target.closest("[data-loot-index]");
      if (!button) return;
      event.preventDefault?.();
      this.takeLootItem(Number(button.dataset.lootIndex));
    };

    this.lootSlots?.addEventListener("pointerup", takeSingle, { passive: false });
    this.lootSlots?.addEventListener("click", takeSingle);
  }

  setupPlantUi() {
    const closePlant = () => this.closePlantPrompt();
    this.plantClose?.addEventListener("pointerup", (event) => {
      event.preventDefault?.();
      closePlant();
    }, { passive: false });
    this.plantClose?.addEventListener("click", closePlant);

    this.plantOptions?.addEventListener("pointerup", (event) => {
      const button = event.target.closest("[data-plant-type]");
      if (!button) return;
      event.preventDefault?.();
      this.confirmPlantCrop(button.dataset.plantType);
    }, { passive: false });

    this.plantOptions?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-plant-type]");
      if (!button) return;
      this.confirmPlantCrop(button.dataset.plantType);
    });
  }

  openPlantPrompt(tile, availableTypes) {
    if (!this.plantOverlay || !this.plantOptions) return false;

    this.pendingPlantTile = { ...tile };
    this.plantOptions.innerHTML = "";

    for (const cropType of availableTypes) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.plantType = cropType;
      button.textContent = "Plant " + resourceName(cropType);
      this.plantOptions.appendChild(button);
    }

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "No / Cancel";
    cancel.addEventListener("pointerup", (event) => {
      event.preventDefault?.();
      this.closePlantPrompt();
    }, { passive: false });
    cancel.addEventListener("click", () => this.closePlantPrompt());
    this.plantOptions.appendChild(cancel);

    if (this.plantMessage) {
      this.plantMessage.textContent = availableTypes.length > 1
        ? "This grass can be planted. Choose a seed, or cancel."
        : "Plant 1 " + resourceName(availableTypes[0]) + " seed here?";
    }

    this.plantOverlay.classList.remove("hidden");
    return true;
  }

  closePlantPrompt() {
    this.pendingPlantTile = null;
    this.plantOverlay?.classList.add("hidden");
  }

  confirmPlantCrop(cropType) {
    const tile = this.pendingPlantTile;
    if (!tile) return;

    if (!hasResource(this.character, cropType, 1)) {
      this.closePlantPrompt();
      this.dialogue.show("You do not have any " + resourceName(cropType) + " to plant.");
      return;
    }

    const existingCrop = (this.currentMap.objects || []).find((object) => !object.hidden && object.crop && Math.round(object.x) === tile.x && Math.round(object.y) === tile.y);
    if (existingCrop) {
      this.closePlantPrompt();
      this.dialogue.show("There is already a crop growing here.");
      return;
    }

    const cropBaseType = cropType === "wheat_seed" ? "wheat" : "barley";

    removeResource(this.character, cropType, 1);
    const objectId = "crop_" + cropBaseType + "_" + Date.now();
    this.currentMap.objects.push({
      id: objectId,
      dynamic: true,
      sprite: cropBaseType + "Crop0",
      x: tile.x,
      y: tile.y,
      drawW: TILE_SIZE,
      drawH: TILE_SIZE,
      solid: false,
      crop: true,
      cropType: cropBaseType,
      plantedFrom: cropType,
      growTime: CROP_TOTAL_GROW_SECONDS,
      totalGrowTime: CROP_TOTAL_GROW_SECONDS,
      interaction: {
        type: "harvest_crop",
        objectId
      }
    });

    this.closePlantPrompt();
    this.updateStatusHud();
    this.renderAllInventoryViews("Planted 1 " + resourceName(cropType) + ".");
    this.dialogue.show("You planted 1 " + resourceName(cropType) + ". It will slowly grow into 3 " + resourceName(cropBaseType) + ".");
  }

  handleNancy() {
    this.openNancyTrade();
  }

  setupTradeUi() {
    this.tradeClose?.addEventListener("pointerup", (event) => {
      event.preventDefault?.();
      this.closeNancyTrade();
    }, { passive: false });
    this.tradeClose?.addEventListener("click", () => this.closeNancyTrade());

    this.tradeOptions?.addEventListener("pointerup", (event) => {
      const button = event.target.closest("[data-trade-action]");
      if (!button) return;
      event.preventDefault?.();
      this.performNancyTrade(button.dataset.tradeAction);
    }, { passive: false });

    this.tradeOptions?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-trade-action]");
      if (!button) return;
      this.performNancyTrade(button.dataset.tradeAction);
    });
  }

  openNancyTrade(message = "Choose what to sell, or close the window to keep your items.") {
    this.dialogue.close();
    this.closeLoot();
    this.closePlantPrompt();
    this.inventoryOpen = false;
    this.inventoryOverlay?.classList.add("hidden");
    this.tradeOverlay?.classList.remove("hidden");
    this.renderNancyTrade(message);
  }

  closeNancyTrade() {
    this.tradeOverlay?.classList.add("hidden");
  }

  renderNancyTrade(message = "Choose what to sell, or close the window to keep your items.") {
    if (!this.tradeOptions) return;
    const eggs = getResourceCount(this.character, "egg");
    const wheat = getResourceCount(this.character, "wheat");
    const barley = getResourceCount(this.character, "barley");
    const bundles = Math.min(Math.floor(wheat / 2), Math.floor(barley / 2));
    const eggValue = eggs * 2;
    const cropValue = bundles * 5;
    const allValue = eggValue + cropValue;

    this.tradeOptions.innerHTML = "";
    this.tradeOptions.appendChild(createTradeOption({
      title: "Sell eggs",
      detail: eggs > 0 ? `Sell ${eggs} egg${eggs === 1 ? "" : "s"} for ${eggValue} GP.` : "No eggs to sell.",
      action: "eggs",
      disabled: eggs <= 0
    }));
    this.tradeOptions.appendChild(createTradeOption({
      title: "Sell wheat + barley",
      detail: bundles > 0 ? `Sell ${bundles} bundle${bundles === 1 ? "" : "s"} of 2 wheat + 2 barley for ${cropValue} GP.` : "Need 2 wheat and 2 barley per bundle.",
      action: "crops",
      disabled: bundles <= 0
    }));
    this.tradeOptions.appendChild(createTradeOption({
      title: "Sell all available",
      detail: allValue > 0 ? `Sell all Nancy-buyable items for ${allValue} GP.` : "Nothing Nancy can buy right now.",
      action: "all",
      disabled: allValue <= 0
    }));
    this.tradeOptions.appendChild(createTradeOption({
      title: "Do not sell",
      detail: "Keep your items and leave the trade window.",
      action: "close",
      disabled: false
    }));
    if (this.tradeMessage) this.tradeMessage.textContent = message;
  }

  performNancyTrade(action) {
    const eggs = getResourceCount(this.character, "egg");
    const wheat = getResourceCount(this.character, "wheat");
    const barley = getResourceCount(this.character, "barley");
    const bundles = Math.min(Math.floor(wheat / 2), Math.floor(barley / 2));

    if (action === "close") {
      this.closeNancyTrade();
      return;
    }

    if (action === "eggs") {
      if (eggs <= 0) return this.renderNancyTrade("Nancy: No eggs there, my lovely.");
      removeResource(this.character, "egg", eggs);
      addGold(this.character, eggs * 2);
      this.updateStatusHud();
      this.renderAllInventoryViews(`Sold ${eggs} egg${eggs === 1 ? "" : "s"}.`);
      this.renderNancyTrade(`Nancy bought ${eggs} egg${eggs === 1 ? "" : "s"} for ${eggs * 2} GP.`);
      return;
    }

    if (action === "crops") {
      if (bundles <= 0) return this.renderNancyTrade("Nancy: I need 2 wheat and 2 barley together, my lovely.");
      removeResource(this.character, "wheat", bundles * 2);
      removeResource(this.character, "barley", bundles * 2);
      addGold(this.character, bundles * 5);
      this.updateStatusHud();
      this.renderAllInventoryViews(`Sold ${bundles} crop bundle${bundles === 1 ? "" : "s"}.`);
      this.renderNancyTrade(`Nancy bought ${bundles} crop bundle${bundles === 1 ? "" : "s"} for ${bundles * 5} GP.`);
      return;
    }

    if (action === "all") {
      const value = (eggs * 2) + (bundles * 5);
      if (value <= 0) return this.renderNancyTrade("Nancy: Nothing I can buy from you just now, my lovely.");
      if (eggs > 0) removeResource(this.character, "egg", eggs);
      if (bundles > 0) {
        removeResource(this.character, "wheat", bundles * 2);
        removeResource(this.character, "barley", bundles * 2);
      }
      addGold(this.character, value);
      this.updateStatusHud();
      this.renderAllInventoryViews(`Sold all Nancy-buyable items for ${value} GP.`);
      this.renderNancyTrade(`Nancy: Lovely stuff. That comes to ${value} GP.`);
    }
  }

  collectResourceObject(objectId, resourceId, amount = 1) {
    const object = this.currentMap.objects.find((entry) => entry.id === objectId);
    const before = getResourceCount(this.character, resourceId);
    addResource(this.character, resourceId, amount);
    const after = getResourceCount(this.character, resourceId);
    const itemName = resourceName(resourceId);

    if (after <= before) {
      const message = "No room to collect " + itemName + ".";
      this.showToast(message, 2.6);
      this.renderAllInventoryViews(message);
      return;
    }

    if (object) object.hidden = true;
    this.updateStatusHud();
    const gained = after - before;
    const message = "You collected " + formatFoundAmount(gained, itemName) + ".";
    this.renderAllInventoryViews(message);
    this.showToast(message, 2.4);
  }

  tryPlantCrop() {
    if (this.currentMap.id !== "nassau") return false;

    const tile = getPlayerTile(this.player);
    const tileId = this.currentMap.ground[tile.y]?.[tile.x];
    const plantableTiles = new Set(["grass", "grassA", "grassB", "flowers"]);
    if (!plantableTiles.has(tileId)) return false;

    const existingCrop = (this.currentMap.objects || []).find((object) => !object.hidden && object.crop && Math.round(object.x) === tile.x && Math.round(object.y) === tile.y);
    if (existingCrop) {
      this.dialogue.show("There is already a crop growing here.");
      return true;
    }

    const availableTypes = [];
    if (hasResource(this.character, "wheat_seed", 1)) availableTypes.push("wheat_seed");
    if (hasResource(this.character, "barley_seed", 1)) availableTypes.push("barley_seed");

    if (!availableTypes.length) {
      this.dialogue.show("This grass can grow crops. Walk through flower grass to find wheat or barley seeds first.");
      return true;
    }

    return this.openPlantPrompt(tile, availableTypes);
  }

  harvestCrop(objectId) {
    const object = this.currentMap.objects.find((entry) => entry.id === objectId);
    if (!object || object.hidden || !object.crop) return;

    if ((object.growTime || 0) > 0) {
      this.dialogue.show("That crop is still growing.");
      return;
    }

    object.hidden = true;
    addResource(this.character, object.cropType, 3);
    this.updateStatusHud();
    this.renderAllInventoryViews("Harvested 3 " + resourceName(object.cropType) + ".");
    this.dialogue.show("You harvested 3 " + resourceName(object.cropType) + ".");
  }

  updateFarmingObjects(dt) {
    for (const map of Object.values(MAPS)) {
      for (const object of map.objects || []) {
        if (!object.crop || object.hidden) continue;
        object.growTime = Math.max(0, (object.growTime || 0) - dt);
        const elapsed = (object.totalGrowTime || CROP_TOTAL_GROW_SECONDS) - object.growTime;
        const stage = Math.min(4, Math.floor(elapsed / CROP_STAGE_SECONDS));
        object.sprite = object.cropType + "Crop" + stage;
      }
    }
  }

  checkFlowerForage() {
    if (this.currentMap.id !== "nassau") return;
    const tile = getPlayerTile(this.player);
    const tileId = this.currentMap.ground[tile.y]?.[tile.x];

    if (tileId !== "flowers") {
      this.lastFlowerFindKey = null;
      return;
    }

    const key = tile.x + "," + tile.y;
    if (this.lastFlowerFindKey === key) return;
    this.lastFlowerFindKey = key;

    if (Math.random() > 0.35) return;
    const resourceId = Math.random() < 0.5 ? "wheat_seed" : "barley_seed";
    const before = getResourceCount(this.character, resourceId);
    addResource(this.character, resourceId, 1);
    const after = getResourceCount(this.character, resourceId);
    const itemName = resourceName(resourceId);

    if (after <= before) {
      const message = "No room to collect " + itemName + ".";
      this.renderAllInventoryViews(message);
      this.showToast(message, 2.6);
      return;
    }

    this.updateStatusHud();
    const message = "You found " + formatFoundAmount(after - before, itemName) + ".";
    this.renderAllInventoryViews(message);
    this.showToast(message, 2.4);
  }

  updateChicken(npc, map, dt) {
    if (map.id !== "nassau") return;

    if (!npc.chickenState) {
      npc.chickenState = {
        phaseIndex: 0,
        phase: "walk",
        timer: CHICKEN_SEQUENCE_SECONDS + (npc.staggerStart || 0),
        peckCount: 0,
        started: false
      };
      npc.animTime = 0;
      this.updateChickenSprite(npc);
    }

    const state = npc.chickenState;
    state.timer -= dt;

    if (!state.started) {
      if (state.timer > CHICKEN_SEQUENCE_SECONDS) {
        this.updateChickenSprite(npc);
        return;
      }
      state.started = true;
      state.timer = CHICKEN_SEQUENCE_SECONDS;
      this.beginChickenWalkStep(npc, map);
    }

    if (state.phase === "walk" && npc.stepping) {
      this.continueChickenStep(npc, dt);
    } else if (state.phase === "peck") {
      npc.animTime = (npc.animTime || 0) + dt;
    } else {
      npc.animTime = 0;
    }

    this.updateChickenSprite(npc);

    if (state.timer > 0) return;

    if (state.phase === "peck") {
      state.peckCount += 1;
      if (state.peckCount >= 10) {
        state.peckCount = 0;
        this.spawnEggNearChicken(npc, map);
      }
    }

    state.phaseIndex = (state.phaseIndex + 1) % 3;
    state.phase = state.phaseIndex === 2 ? "peck" : "walk";
    state.timer = CHICKEN_SEQUENCE_SECONDS;
    npc.animTime = 0;
    npc.stepping = false;
    npc.moving = false;

    if (state.phase === "walk") this.beginChickenWalkStep(npc, map);
    this.updateChickenSprite(npc);
  }

  beginChickenWalkStep(npc, map) {
    const target = this.findChickenMoveTarget(npc, map);
    if (!target) {
      npc.stepping = false;
      npc.moving = false;
      return;
    }

    npc.direction = target.direction;
    npc.startX = npc.x;
    npc.startY = npc.y;
    npc.targetX = target.x;
    npc.targetY = target.y;
    npc.stepElapsed = 0;
    npc.animTime = 0;
    npc.stepping = true;
    npc.moving = true;
  }

  continueChickenStep(npc, dt) {
    npc.stepElapsed = (npc.stepElapsed || 0) + dt;
    npc.animTime = (npc.animTime || 0) + dt;

    const t = Math.min(1, npc.stepElapsed / CHICKEN_WALK_STEP_SECONDS);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    npc.x = lerp(npc.startX, npc.targetX, eased);
    npc.y = lerp(npc.startY, npc.targetY, eased);

    if (t >= 1) {
      npc.x = npc.targetX;
      npc.y = npc.targetY;
      npc.stepping = false;
      npc.moving = false;
      npc.animTime = 0;
    }
  }

  updateChickenSprite(npc) {
    if (npc.chickenState?.phase === "peck") {
      const frame = Math.floor((npc.animTime || 0) * 5) % 4;
      npc.sprite = "chickenPeck" + frame;
      return;
    }

    const direction = npc.direction || "down";
    const dirName = direction.charAt(0).toUpperCase() + direction.slice(1);
    const frame = npc.moving ? Math.floor((npc.animTime || 0) * 10) % 4 : 0;
    npc.sprite = "chickenWalk" + dirName + frame;
  }

  spawnEggNearChicken(npc, map) {
    const tile = this.findEggTileNearChicken(npc, map);
    if (!tile) return;
    const objectId = "egg_" + Date.now() + "_" + Math.floor(Math.random() * 9999);

    map.objects.push({
      id: objectId,
      dynamic: true,
      sprite: "egg",
      x: tile.x + 0.18,
      y: tile.y + 0.18,
      drawW: 30,
      drawH: 30,
      solid: false,
      resourceId: "egg",
      interaction: {
        type: "collect_resource",
        objectId,
        resourceId: "egg",
        amount: 1
      }
    });
    this.saveGame(false);
  }

  findEggTileNearChicken(npc, map) {
    const baseX = Math.round(npc.x);
    const baseY = Math.round(npc.y);
    const offsets = [
      [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1]
    ];

    for (const [dx, dy] of offsets) {
      const x = baseX + dx;
      const y = baseY + dy;
      const tileId = map.ground[y]?.[x];
      if (!tileId || tileId === "water" || tileId === "shallowWater") continue;
      const hasEgg = (map.objects || []).some((object) => !object.hidden && object.resourceId === "egg" && Math.round(object.x) === x && Math.round(object.y) === y);
      if (hasEgg) continue;
      return { x, y };
    }

    return null;
  }

  findChickenMoveTarget(npc, map) {
    const choices = [
      { dx: 0, dy: -1, direction: "up" },
      { dx: 0, dy: 1, direction: "down" },
      { dx: -1, dy: 0, direction: "left" },
      { dx: 1, dy: 0, direction: "right" }
    ];
    const shuffled = choices.sort(() => Math.random() - 0.5);

    for (const choice of shuffled) {
      const nextX = Math.round(npc.x) + choice.dx;
      const nextY = Math.round(npc.y) + choice.dy;

      const tileId = map.ground[nextY]?.[nextX];
      if (!tileId || tileId === "water" || tileId === "shallowWater") continue;
      if ((map.objects || []).some((object) => object.solid && !object.hidden && Math.round(object.hitbox?.x ?? object.x) === nextX && Math.round(object.hitbox?.y ?? object.y) === nextY)) continue;
      if ((map.npcs || []).some((other) => other !== npc && !other.hidden && Math.round(other.x) === nextX && Math.round(other.y) === nextY)) continue;

      const playerTile = getPlayerTile(this.player);
      if (playerTile.x === nextX && playerTile.y === nextY) continue;

      return { x: nextX, y: nextY, direction: choice.direction };
    }

    return null;
  }

  applyNassauAwayProgress(elapsedSeconds) {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
    const cycles = Math.min(CHICKEN_MAX_AWAY_EGGS, Math.floor(elapsedSeconds / CHICKEN_FULL_EGG_CYCLE_SECONDS));

    if (cycles > 0) {
      for (const npc of MAPS.nassau.npcs || []) {
        if (npc.hidden || npc.script !== "chicken_roam") continue;
        for (let i = 0; i < cycles; i++) this.spawnEggNearChicken(npc, MAPS.nassau);
        npc.chickenState = null;
        npc.animTime = 0;
        npc.sprite = "chickenWalkDown0";
      }
    }
  }


  showToast(message, seconds = 2.4) {
    if (!this.toastElement) {
      this.toastElement = document.createElement("div");
      this.toastElement.id = "collectionToast";
      this.toastElement.setAttribute("role", "status");
      this.toastElement.setAttribute("aria-live", "polite");
      document.body.appendChild(this.toastElement);
    }

    this.toastElement.textContent = message;
    this.toastElement.classList.add("visible");
    this.toastTimer = seconds;
  }

  updateToast(dt) {
    if (!this.toastElement || this.toastTimer <= 0) return;
    this.toastTimer -= dt;
    if (this.toastTimer <= 0) {
      this.toastTimer = 0;
      this.toastElement.classList.remove("visible");
    }
  }

  saveGame(showMessage = false) {
    if (!this.characterSelected) return;

    const saveData = {
      version: 1,
      savedAt: Date.now(),
      currentMapId: this.currentMap.id,
      player: {
        tileX: Math.round((this.player.x / TILE_SIZE) - 0.5),
        tileY: Math.round((this.player.y / TILE_SIZE) - 0.5),
        direction: this.player.direction,
        characterKey: this.player.characterKey
      },
      character: this.character,
      chestStates: this.chestStates,
      maps: this.serialiseMapState()
    };

    const ok = writeGameSave(saveData);
    if (ok && showMessage && this.saveStatusText) this.saveStatusText.textContent = "Game saved on this device.";
  }

  serialiseMapState() {
    const maps = {};

    for (const [mapId, map] of Object.entries(MAPS)) {
      maps[mapId] = {
        hiddenObjects: (map.objects || []).filter((object) => object.hidden && !object.dynamic).map((object) => object.id),
        dynamicObjects: (map.objects || []).filter((object) => object.dynamic && !object.hidden).map((object) => serialiseDynamicObject(object)),
        npcs: (map.npcs || []).map((npc) => ({
          id: npc.id,
          x: npc.x,
          y: npc.y,
          direction: npc.direction,
          hidden: Boolean(npc.hidden),
          script: npc.script || null,
          sprite: npc.sprite,
          chickenState: npc.chickenState || null
        }))
      };
    }

    return maps;
  }

  applySaveData(save) {
    this.character = mergeCharacterState(createCharacterState(), save.character || {});
    this.chestStates = save.chestStates || {};

    this.applySavedMapState(save.maps || {});

    const map = MAPS[save.currentMapId] || MAPS.nassau;
    this.currentMap = map;

    const playerSave = save.player || {};
    setPlayerCharacter(this.player, playerSave.characterKey || this.player.characterKey);
    setPlayerSpawn(this.player, {
      tileX: Number.isFinite(playerSave.tileX) ? playerSave.tileX : 21,
      tileY: Number.isFinite(playerSave.tileY) ? playerSave.tileY : 22,
      direction: playerSave.direction || "down",
      characterKey: playerSave.characterKey || this.player.characterKey
    });

    if (save.savedAt) {
      const elapsed = Math.max(0, (Date.now() - save.savedAt) / 1000);
      this.applyOfflineCropGrowth(elapsed);
      if (this.currentMap.id !== "nassau") this.applyNassauAwayProgress(elapsed);
    }

    this.syncOpenedChestSprites();
    this.updateHud();
    this.updateStatusHud();
    this.renderAllInventoryViews("Save loaded.");
  }

  applySavedMapState(savedMaps) {
    for (const [mapId, saved] of Object.entries(savedMaps)) {
      const map = MAPS[mapId];
      if (!map) continue;

      map.objects = (map.objects || []).filter((object) => !object.dynamic);
      for (const object of map.objects || []) object.hidden = false;

      for (const objectId of saved.hiddenObjects || []) {
        const object = map.objects.find((entry) => entry.id === objectId);
        if (object) object.hidden = true;
      }

      for (const savedObject of saved.dynamicObjects || []) {
        map.objects.push({ ...savedObject });
      }

      for (const npcState of saved.npcs || []) {
        const npc = (map.npcs || []).find((entry) => entry.id === npcState.id);
        if (!npc) continue;
        npc.x = npcState.x;
        npc.y = npcState.y;
        npc.direction = npcState.direction || npc.direction || "down";
        npc.hidden = Boolean(npcState.hidden);
        npc.script = npcState.script || npc.script;
        npc.sprite = npcState.sprite || npc.sprite;
        npc.chickenState = npcState.chickenState || null;
        npc.stepping = false;
        npc.moving = false;
        npc.animTime = 0;
      }
    }
  }

  applyOfflineCropGrowth(elapsedSeconds) {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
    for (const map of Object.values(MAPS)) {
      for (const object of map.objects || []) {
        if (!object.crop || object.hidden) continue;
        object.growTime = Math.max(0, (object.growTime || 0) - elapsedSeconds);
        const elapsed = (object.totalGrowTime || CROP_TOTAL_GROW_SECONDS) - object.growTime;
        const stage = Math.min(4, Math.floor(elapsed / CROP_STAGE_SECONDS));
        object.sprite = object.cropType + "Crop" + stage;
      }
    }
  }

  isUiBlockingMovement() {
    return this.inventoryOpen || Boolean(this.lootContext) || Boolean(this.pendingPlantTile) || !this.tradeOverlay?.classList.contains("hidden");
  }

  changeMap(mapId, spawnName) {
    const targetMap = MAPS[mapId];

    if (!targetMap) {
      this.dialogue.show(`Map "${mapId}" does not exist yet.`);
      return;
    }

    const previousMapId = this.currentMap.id;
    const now = performance.now();

    if (previousMapId === "nassau" && targetMap.id !== "nassau") {
      this.leftNassauAt = now;
    }

    if (previousMapId !== "nassau" && targetMap.id === "nassau" && this.leftNassauAt !== null) {
      this.applyNassauAwayProgress((now - this.leftNassauAt) / 1000);
      this.leftNassauAt = null;
    }

    this.currentMap = targetMap;
    setPlayerSpawn(this.player, getSpawnForMap(targetMap, spawnName));
    this.syncOpenedChestSprites();
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
    if (this.eggText) this.eggText.textContent = getResourceCount(this.character, "egg");
    if (this.wheatText) this.wheatText.textContent = getResourceCount(this.character, "wheat");
    if (this.barleyText) this.barleyText.textContent = getResourceCount(this.character, "barley");
    this.renderQuickInventory();
  }
}


function serialiseDynamicObject(object) {
  const clone = JSON.parse(JSON.stringify(object));
  return clone;
}

function mergeCharacterState(base, saved) {
  return {
    ...base,
    ...saved,
    resources: { ...base.resources, ...(saved.resources || {}) },
    hands: { ...base.hands, ...(saved.hands || {}) },
    pockets: Array.isArray(saved.pockets) ? saved.pockets : base.pockets,
    openedChests: { ...base.openedChests, ...(saved.openedChests || {}) },
    quests: { ...base.quests, ...(saved.quests || {}) },
    flags: { ...base.flags, ...(saved.flags || {}) }
  };
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

  if (!npc.stepping) {
    const target = npc.path[npc.pathIndex];
    const dx = target.x - npc.x;
    const dy = target.y - npc.y;

    if (dx === 0 && dy === 0) {
      npc.pathIndex++;
      return;
    }

    npc.startX = npc.x;
    npc.startY = npc.y;
    npc.targetX = target.x;
    npc.targetY = target.y;
    npc.stepElapsed = 0;
    npc.animTime = 0;
    npc.stepping = true;
    npc.moving = true;

    if (Math.abs(dx) > Math.abs(dy)) npc.direction = dx > 0 ? "right" : "left";
    else npc.direction = dy > 0 ? "down" : "up";
  }

  npc.stepElapsed += dt;
  npc.animTime = (npc.animTime || 0) + dt;
  const t = Math.min(1, npc.stepElapsed / NPC_STEP_DURATION);
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  npc.x = lerp(npc.startX, npc.targetX, eased);
  npc.y = lerp(npc.startY, npc.targetY, eased);
  updateNpcSprite(npc);

  if (t >= 1) {
    npc.x = npc.targetX;
    npc.y = npc.targetY;
    npc.pathIndex++;
    npc.stepping = false;
    npc.moving = false;
    npc.animTime = 0;
    updateNpcSprite(npc);

    if (npc.pathIndex >= npc.path.length) {
      npc.hidden = true;
      npc.script = null;
    }
  }
}

function updateNpcSprite(npc) {
  if (npc.anims) {
    const frames = npc.anims[npc.direction] || npc.anims.down;
    const frameIndex = npc.moving ? Math.floor((npc.animTime || 0) * 10) % frames.length : 0;
    npc.sprite = frames[frameIndex];
    return;
  }

  if (npc.standingSprites) {
    npc.sprite = npc.standingSprites[npc.direction] || npc.standingSprites.down || npc.sprite;
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
  const labelHtml = label ? `<strong>${label}</strong>` : "";
  button.className = `${baseClass} ${filledClass}`;
  button.innerHTML = `${labelHtml}<span>${item ? formatInventoryItemName(item) : "Empty"}</span>`;
  return button;
}

function formatInventoryItemName(item) {
  if (!item) return "Empty";
  const qty = item.qty || 1;
  return qty > 1 ? item.name + " ×" + qty : item.name;
}

function createTradeOption({ title, detail, action, disabled }) {
  const wrapper = document.createElement("div");
  wrapper.className = "tradeOption";
  wrapper.innerHTML = `<div><strong>${title}</strong><span>${detail}</span></div>`;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.tradeAction = action;
  button.disabled = Boolean(disabled);
  button.textContent = action === "close" ? "Close" : "Sell";
  wrapper.appendChild(button);
  return wrapper;
}

function formatFoundAmount(amount, itemName) {
  const safeAmount = Math.max(1, amount || 1);
  const plural = safeAmount === 1 ? itemName : pluraliseItemName(itemName);
  return safeAmount + " " + plural;
}

function pluraliseItemName(itemName) {
  if (itemName === "barley") return "barley";
  if (itemName === "wheat") return "wheat";
  if (itemName === "egg") return "eggs";
  if (itemName.endsWith("seed")) return itemName + "s";
  return itemName + "s";
}

function resourceName(resourceId) {
  if (resourceId === "egg") return "egg";
  if (resourceId === "wheat_seed") return "wheat seed";
  if (resourceId === "barley_seed") return "barley seed";
  if (resourceId === "wheat") return "wheat";
  if (resourceId === "barley") return "barley";
  return resourceId;
}

function getPlayerTile(player) {
  return {
    x: Math.round((player.x / TILE_SIZE) - 0.5),
    y: Math.round((player.y / TILE_SIZE) - 0.5)
  };
}

function getLootLabel(item) {
  if (item.kind === "gold") return `${item.amount || 0} GP`;
  return item.itemId || "Item";
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
