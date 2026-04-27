import { MAPS, getSpawnForMap } from "./maps.js";
import { createInput } from "./input.js";
import { createPlayer, setPlayerSpawn, updatePlayer } from "./player.js";
import {
  findInteraction,
  findInteractionAtWorldPoint,
  findPortal,
  findPortalAtWorldPoint
} from "./interactions.js";
import { createDialogue } from "./dialogue.js";
import { createRenderer } from "./renderer.js";

export class Game {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.images = images;
    this.input = createInput(canvas);
    this.dialogue = createDialogue();
    this.renderer = createRenderer(canvas, images);

    this.currentMap = MAPS.nassau;
    this.player = createPlayer(getSpawnForMap(this.currentMap));
    this.portalCooldown = 0;

    this.lastTime = performance.now();
    this.running = false;

    this.locationName = document.getElementById("locationName");
    this.hintText = document.getElementById("hintText");
    this.updateHud();

    this.dialogue.show(
      "Royal Britannia: Nassau Prototype v0.3. This version uses the individual transparent PNG assets, mobile-first landscape layout, right-side D-pad, tap interaction, collision, NPCs, and map loading."
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

    const tap = this.input.consumeTap();
    if (tap) {
      if (this.dialogue.active) {
        this.dialogue.close();
        return;
      }

      const worldPoint = this.renderer.screenToWorld(tap.x, tap.y);
      const tappedPortal = findPortalAtWorldPoint(this.currentMap, worldPoint.x, worldPoint.y);
      if (tappedPortal && this.portalCooldown <= 0) {
        this.changeMap(tappedPortal.targetMap, tappedPortal.targetSpawn);
        return;
      }

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

      const interaction = findInteraction(this.currentMap, this.player);
      if (interaction) {
        this.handleInteraction(interaction);
        return;
      }
    }

    if (this.dialogue.active) return;

    updatePlayer(this.player, this.currentMap, this.input.state, dt);

    if (this.portalCooldown <= 0) {
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
      this.dialogue.show(interaction.text);
      return;
    }

    this.dialogue.show("Nothing happens yet.");
  }

  changeMap(mapId, spawnName) {
    const targetMap = MAPS[mapId];

    if (!targetMap) {
      this.dialogue.show(`Map "${mapId}" does not exist yet.`);
      return;
    }

    this.currentMap = targetMap;
    setPlayerSpawn(this.player, getSpawnForMap(targetMap, spawnName));
    this.portalCooldown = 0.75;
    this.updateHud();
  }

  updateHud() {
    this.locationName.textContent = this.currentMap.name;
    this.hintText.textContent = "Mobile: D-pad to move · tap objects/NPCs · Desktop: arrows/WASD + E";
  }
}
