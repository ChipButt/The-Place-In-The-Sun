import { TILE_SIZE, PLAYER } from "./config.js";
import { MAPS, getSpawnForMap } from "./maps.js";
import { createInput } from "./input.js";
import { createPlayer, setPlayerCharacter, setPlayerSpawn, updatePlayer } from "./player.js";
import { findInteraction, findPortal } from "./interactions.js";
import { createDialogue } from "./dialogue.js";
import { createRenderer } from "./renderer.js";
import {
  addGold,
  addResource,
  removeResource,
  removeResourceBundle,
  hasResource,
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
    this.flowerFindCooldown = 0;
    this.leftNassauAt = null;

    this.startScreen = document.getElementById("startScreen");
    this.loadingText = document.getElementById("loadingText");

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

    this.lootOverlay = document.getElementById("lootOverlay");
    this.lootTitle = document.getElementById("lootTitle");
    this.lootSlots = document.getElementById("lootSlots");
    this.lootMessage = document.getElementById("lootMessage");

    this.setupCharacterSelectUi();
    this.setupInventoryUi();
    this.setupLootUi();
    this.setupPlantUi();
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
    this.syncOpenedChestSprites();
    this.renderer.draw(this.currentMap, this.player, this.character);

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    this.updateNpcScripts(dt);
    this.updateFarmingObjects(dt);
    if (this.flowerFindCooldown > 0) this.flowerFindCooldown -= dt;

    if (!this.characterSelected) return;

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
      { x: 22, y: 12 },
      { x: 23, y: 12 },
      { x: 24, y: 12 },
      { x: 25, y: 11 },
      { x: 26, y: 10 },
      { x: 27, y: 9 },
      { x: 28, y: 8 },
      { x: 29, y: 8 }
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

    removeResource(this.character, cropType, 1);
    const objectId = "crop_" + cropType + "_" + Date.now();
    this.currentMap.objects.push({
      id: objectId,
      sprite: cropType + "Crop0",
      x: tile.x,
      y: tile.y + 0.15,
      drawW: 48,
      drawH: 38,
      solid: false,
      crop: true,
      cropType,
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
    this.dialogue.show("You planted 1 " + resourceName(cropType) + ". It will slowly grow into 3 " + resourceName(cropType) + ".");
  }

  handleNancy() {
    const eggs = this.character.resources?.egg || 0;
    const wheat = this.character.resources?.wheat || 0;
    const barley = this.character.resources?.barley || 0;

    if (eggs >= 1) {
      removeResource(this.character, "egg", 1);
      addGold(this.character, 2);
      this.updateStatusHud();
      this.renderAllInventoryViews("Nancy bought 1 egg for 2 GP.");
      this.dialogue.show("Nancy: Hello my lovelies, how can I help you today then? Ooh, lovely egg. I’ll give you 2 gold for that.");
      return;
    }

    if (wheat >= 2 && barley >= 2) {
      removeResourceBundle(this.character, { wheat: 2, barley: 2 });
      addGold(this.character, 5);
      this.updateStatusHud();
      this.renderAllInventoryViews("Nancy bought 2 wheat and 2 barley for 5 GP.");
      this.dialogue.show("Nancy: Hello my lovelies, how can I help you today then? Perfect! Two wheat and two barley. That’ll do nicely for the tavern. Here’s 5 gold.");
      return;
    }

    this.dialogue.show("Nancy: Hello my lovelies, how can I help you today then? Bring me 1 egg for 2 gold, or 2 wheat and 2 barley together for 5 gold.");
  }

  collectResourceObject(objectId, resourceId, amount = 1) {
    const object = this.currentMap.objects.find((entry) => entry.id === objectId);
    if (object) object.hidden = true;
    addResource(this.character, resourceId, amount);
    this.updateStatusHud();
    this.renderAllInventoryViews("Collected " + amount + " " + resourceName(resourceId) + ".");
    this.dialogue.show("You collected " + amount + " " + resourceName(resourceId) + ".");
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
    if (hasResource(this.character, "wheat", 1)) availableTypes.push("wheat");
    if (hasResource(this.character, "barley", 1)) availableTypes.push("barley");

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
    if (tileId !== "flowers") return;

    const key = tile.x + "," + tile.y;
    if (this.lastFlowerFindKey === key && this.flowerFindCooldown > 0) return;
    this.lastFlowerFindKey = key;
    this.flowerFindCooldown = 2.5;

    if (Math.random() > 0.35) return;
    const resourceId = Math.random() < 0.5 ? "wheat" : "barley";
    addResource(this.character, resourceId, 1);
    this.updateStatusHud();
    this.renderAllInventoryViews("Found 1 " + resourceName(resourceId) + " in the flowers.");
  }

  updateChicken(npc, map, dt) {
    if (map.id !== "nassau") return;

    if (!npc.chickenState) {
      npc.chickenState = {
        phaseIndex: 0,
        phase: "walk",
        timer: CHICKEN_SEQUENCE_SECONDS,
        peckCount: 0
      };
      this.tryMoveChicken(npc, map);
    }

    npc.animTime = (npc.animTime || 0) + dt;
    npc.chickenState.timer -= dt;
    this.updateChickenSprite(npc);

    if (npc.chickenState.timer > 0) return;

    if (npc.chickenState.phase === "peck") {
      npc.chickenState.peckCount += 1;
      if (npc.chickenState.peckCount >= 10) {
        npc.chickenState.peckCount = 0;
        this.spawnEggNearChicken(npc, map);
      }
    }

    npc.chickenState.phaseIndex = (npc.chickenState.phaseIndex + 1) % 3;
    npc.chickenState.phase = npc.chickenState.phaseIndex === 2 ? "peck" : "walk";
    npc.chickenState.timer = CHICKEN_SEQUENCE_SECONDS;
    npc.animTime = 0;

    if (npc.chickenState.phase === "walk") {
      this.tryMoveChicken(npc, map);
    }

    this.updateChickenSprite(npc);
  }

  updateChickenSprite(npc) {
    const frame = Math.floor((npc.animTime || 0) * 4) % 4;
    if (npc.chickenState?.phase === "peck") {
      npc.sprite = "chickenPeck" + frame;
      return;
    }

    const direction = npc.direction || "down";
    const dirName = direction.charAt(0).toUpperCase() + direction.slice(1);
    npc.sprite = "chickenWalk" + dirName + frame;
  }

  spawnEggNearChicken(npc, map) {
    const tile = this.findEggTileNearChicken(npc, map);
    if (!tile) return;
    const objectId = "egg_" + Date.now() + "_" + Math.floor(Math.random() * 9999);

    map.objects.push({
      id: objectId,
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

  tryMoveChicken(npc, map) {
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

      npc.direction = choice.direction;
      npc.x = nextX;
      npc.y = nextY;
      return;
    }
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

  isUiBlockingMovement() {
    return this.inventoryOpen || Boolean(this.lootContext) || Boolean(this.pendingPlantTile);
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
    if (this.eggText) this.eggText.textContent = this.character.resources?.egg || 0;
    if (this.wheatText) this.wheatText.textContent = this.character.resources?.wheat || 0;
    if (this.barleyText) this.barleyText.textContent = this.character.resources?.barley || 0;
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
  button.innerHTML = `${labelHtml}<span>${item ? item.name : "Empty"}</span>`;
  return button;
}

function resourceName(resourceId) {
  if (resourceId === "egg") return "egg";
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
