import { TILE_SIZE, PLAYER, DEBUG } from "./config.js";
import { SPRITES, CHARACTER_SETS, DEFAULT_CHARACTER } from "./assets.js";
import { TILE_DEFS } from "./maps.js";
import { getObjectHitbox, getNpcHitbox, getPlayerHitbox, getPortalRect } from "./collision.js";

export function createRenderer(canvas, images) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const camera = { x: 0, y: 0, w: 0, h: 0 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width * ratio));
    const h = Math.max(1, Math.floor(rect.height * ratio));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.imageSmoothingEnabled = false;

    camera.w = rect.width;
    camera.h = rect.height;
  }

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 150));
  resize();

  function updateCamera(map, player) {
    const worldW = map.width * TILE_SIZE;
    const worldH = map.height * TILE_SIZE;

    camera.x = player.x - camera.w / 2;
    camera.y = player.y - camera.h / 2;

    camera.x = clamp(camera.x, 0, Math.max(0, worldW - camera.w));
    camera.y = clamp(camera.y, 0, Math.max(0, worldH - camera.h));
  }

  function draw(map, player, character = null) {
    resize();
    updateCamera(map, player);

    ctx.clearRect(0, 0, camera.w, camera.h);
    ctx.fillStyle = "#0c4a6e";
    ctx.fillRect(0, 0, camera.w, camera.h);

    drawGround(map);
    drawPortalHints(map);

    const drawables = [
      ...(map.objects || [])
        .filter((object) => !object.hidden && !object.collisionOnly)
        .map((object) => ({ kind: "object", data: object, sortY: getObjectSortY(object) })),
      ...(map.npcs || [])
        .filter((npc) => !npc.hidden)
        .map((npc) => ({ kind: "npc", data: npc, sortY: (npc.y * TILE_SIZE) + (npc.drawH || 58) })),
      { kind: "player", data: player, sortY: player.y + PLAYER.drawHeight / 2 }
    ].sort((a, b) => a.sortY - b.sortY);

    for (const item of drawables) {
      if (item.kind === "object") drawObject(item.data);
      if (item.kind === "npc") drawNpc(item.data);
      if (item.kind === "player") drawPlayer(item.data);
    }

    drawObjectOverlays(map);

    if (DEBUG.showCollision) drawCollisionDebug(map, player);
    if (DEBUG.showPortalZones) drawPortalDebug(map);

    drawCaveDarkness(map, player, character);
    drawVignette();
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left + camera.x,
      y: clientY - rect.top + camera.y
    };
  }

  function drawGround(map) {
    const startX = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const startY = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const endX = Math.min(map.width, Math.ceil((camera.x + camera.w) / TILE_SIZE) + 1);
    const endY = Math.min(map.height, Math.ceil((camera.y + camera.h) / TILE_SIZE) + 1);

    const waterFrame = Math.floor(performance.now() / 350) % 3;
    const tallGrassFrame = Math.floor(performance.now() / 450) % 3;

    const getTile = (tx, ty) => {
      if (ty < 0 || ty >= map.height || tx < 0 || tx >= map.width) return null;
      return map.ground[ty][tx];
    };

    const isWaterTile = (tx, ty) => {
      const id = getTile(tx, ty);
      return id === "water" || id === "shallowWater";
    };

    const getShoreSprite = (tx, ty) => {
      const n = isWaterTile(tx, ty - 1);
      const e = isWaterTile(tx + 1, ty);
      const s = isWaterTile(tx, ty + 1);
      const w = isWaterTile(tx - 1, ty);
      const nw = isWaterTile(tx - 1, ty - 1);
      const ne = isWaterTile(tx + 1, ty - 1);
      const se = isWaterTile(tx + 1, ty + 1);
      const sw = isWaterTile(tx - 1, ty + 1);

      if (n && w) return "shoreNorthWest";
      if (n && e) return "shoreNorthEast";
      if (s && e) return "shoreSouthEast";
      if (s && w) return "shoreSouthWest";
      if (n) return "shoreNorth";
      if (e) return "shoreEast";
      if (s) return "shoreSouth";
      if (w) return "shoreWest";
      if (nw) return "shoreNorthWest";
      if (ne) return "shoreNorthEast";
      if (se) return "shoreSouthEast";
      if (sw) return "shoreSouthWest";
      return null;
    };

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tileId = map.ground[y][x];
        let spriteKey = TILE_DEFS[tileId]?.sprite || "grass";

        if (tileId === "water" || tileId === "shallowWater") {
          spriteKey = ["waterFrame1", "waterFrame2", "waterFrame3"][waterFrame];
        } else if (tileId === "sand") {
          const shoreSprite = getShoreSprite(x, y);
          if (shoreSprite) {
            spriteKey = shoreSprite;
          } else {
            const hash = Math.abs((x * 73856093) ^ (y * 19349663)) % 100;
            spriteKey = hash < 8 ? "sandShell" : "sand";
          }
        } else if (tileId === "tallGrass") {
          spriteKey = ["tallGrassFrame1", "tallGrassFrame2", "tallGrassFrame3"][tallGrassFrame];
        } else if (tileId === "flowers") {
          const hash = Math.abs((x * 83492791) ^ (y * 2971215073)) % 100;
          spriteKey = hash < 25 ? "flowersLarge" : "flowersSubtle";
        } else if (tileId === "grass" || tileId === "grassA" || tileId === "grassB" || tileId === "grassBlock") {
          spriteKey = "grass";
        }

        drawSprite(spriteKey, x * TILE_SIZE - camera.x, y * TILE_SIZE - camera.y, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  function drawPortalHints(map) {
    for (const portal of map.portals || []) {
      const rect = getPortalRect(portal);
      ctx.save();
      ctx.fillStyle = "rgba(255, 244, 199, 0.22)";
      ctx.fillRect(rect.x - camera.x, rect.y - camera.y, rect.w, rect.h);
      ctx.restore();
    }
  }

  function drawObjectOverlays(map) {
    for (const object of map.objects || []) {
      if (object.hidden || object.collisionOnly || !object.roofOverlay) continue;
      drawObjectTriangleOverlay(object);
    }
  }

  function drawObjectTriangleOverlay(object) {
    const sprite = SPRITES[object.sprite];
    const image = images[sprite?.image || object.sprite];
    if (!sprite || !image) return;

    const dx = object.x * TILE_SIZE - camera.x;
    const dy = object.y * TILE_SIZE - camera.y;
    const dw = object.drawW || TILE_SIZE;
    const dh = object.drawH || TILE_SIZE;
    const points = object.roofOverlay.points || [];

    if (points.length < 3) return;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const px = dx + (points[i].x / 9) * dw;
      const py = dy + (points[i].y / 9) * dh;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();
    drawSprite(object.sprite, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawObject(object) {
    if (object.sprite === "caveMouth") {
      drawCaveMouth(object);
      return;
    }

    if (object.sprite === "house") {
      drawHouseObject(object);
      return;
    }

    drawSprite(
      object.sprite,
      object.x * TILE_SIZE - camera.x,
      object.y * TILE_SIZE - camera.y,
      object.drawW || TILE_SIZE,
      object.drawH || TILE_SIZE
    );
  }

  function drawNpc(npc) {
    drawSprite(
      npc.sprite || "citizenDown0",
      npc.x * TILE_SIZE - camera.x,
      npc.y * TILE_SIZE - camera.y,
      npc.drawW || PLAYER.drawWidth,
      npc.drawH || PLAYER.drawHeight
    );
  }

  function drawPlayer(player) {
    const set = CHARACTER_SETS[player.characterKey] || CHARACTER_SETS[DEFAULT_CHARACTER];
    const frames = set.anims[player.direction] || set.anims.down;
    const frameIndex = player.moving ? Math.floor(player.animTime * 10) % frames.length : 0;
    const spriteKey = frames[frameIndex];

    drawSprite(
      spriteKey,
      player.x - PLAYER.drawWidth / 2 - camera.x,
      player.y - PLAYER.drawHeight / 2 - camera.y,
      PLAYER.drawWidth,
      PLAYER.drawHeight
    );
  }

  function drawSprite(spriteKey, dx, dy, dw, dh) {
    const sprite = SPRITES[spriteKey];
    const image = images[sprite?.image || spriteKey];

    if (!sprite || !image) {
      drawMissingSprite(dx, dy, dw, dh, spriteKey);
      return;
    }

    if (Number.isFinite(sprite.sx)) {
      ctx.drawImage(
        image,
        sprite.sx,
        sprite.sy,
        sprite.sw,
        sprite.sh,
        Math.round(dx),
        Math.round(dy),
        Math.round(dw),
        Math.round(dh)
      );
      return;
    }

    ctx.drawImage(image, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
  }

  function drawHouseObject(object) {
    drawSprite(
      "house",
      object.x * TILE_SIZE - camera.x,
      object.y * TILE_SIZE - camera.y,
      object.drawW || TILE_SIZE,
      object.drawH || TILE_SIZE
    );
  }

  function drawCaveMouth(object) {
    const x = object.x * TILE_SIZE - camera.x;
    const y = object.y * TILE_SIZE - camera.y;
    const tile = TILE_SIZE;

    // Built from locked basictiles.png co-ordinates:
    // rock surround = 2 down / 8 across, entrance = 7 down / 3 across.
    const layout = [
      ["caveRockBlock", "caveRockBlock", "caveRockBlock"],
      ["caveRockBlock", "caveRockBlock", "caveRockBlock"],
      ["caveRockBlock", "caveEntranceTile", "caveRockBlock"]
    ];

    for (let row = 0; row < layout.length; row++) {
      for (let col = 0; col < layout[row].length; col++) {
        drawSprite(layout[row][col], x + col * tile, y + row * tile, tile, tile);
      }
    }
  }

  function drawMissingSprite(dx, dy, dw, dh, label) {
    ctx.fillStyle = "#ff00ff";
    ctx.fillRect(dx, dy, dw, dh);
    ctx.fillStyle = "#000";
    ctx.font = "10px monospace";
    ctx.fillText(label, dx + 2, dy + 12);
  }

  function drawCollisionDebug(map, player) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,0,0,0.7)";
    ctx.lineWidth = 2;

    for (const object of map.objects || []) {
      if (!object.solid || object.hidden) continue;
      const box = getObjectHitbox(object);
      ctx.strokeRect(box.x - camera.x, box.y - camera.y, box.w, box.h);
    }

    for (const npc of map.npcs || []) {
      if (npc.hidden) continue;
      const box = getNpcHitbox(npc);
      ctx.strokeRect(box.x - camera.x, box.y - camera.y, box.w, box.h);
    }

    const playerBox = getPlayerHitbox(player);
    ctx.strokeStyle = "rgba(0,255,255,0.8)";
    ctx.strokeRect(playerBox.x - camera.x, playerBox.y - camera.y, playerBox.w, playerBox.h);
    ctx.restore();
  }

  function drawPortalDebug(map) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,0,0.9)";
    ctx.lineWidth = 2;
    for (const portal of map.portals || []) {
      const box = getPortalRect(portal);
      ctx.strokeRect(box.x - camera.x, box.y - camera.y, box.w, box.h);
    }
    ctx.restore();
  }


  function drawCaveDarkness(map, player, character) {
    if (!map.dark) return;

    const torchEquipped = character?.hands?.left?.id === "torch" || character?.hands?.right?.id === "torch";
    const radius = (torchEquipped ? (map.torchRadiusTiles || 3) : 0.85) * TILE_SIZE;
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;

    const gradient = ctx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      Math.max(1, radius * 0.25),
      playerScreenX,
      playerScreenY,
      radius
    );

    if (torchEquipped) {
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.62, "rgba(0,0,0,0.08)");
      gradient.addColorStop(1, "rgba(0,0,0,0.94)");
    } else {
      gradient.addColorStop(0, "rgba(0,0,0,0.12)");
      gradient.addColorStop(0.48, "rgba(0,0,0,0.78)");
      gradient.addColorStop(1, "rgba(0,0,0,0.985)");
    }

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, camera.w, camera.h);
    ctx.restore();
  }

  function drawVignette() {
    const gradient = ctx.createRadialGradient(
      camera.w / 2,
      camera.h / 2,
      Math.min(camera.w, camera.h) * 0.25,
      camera.w / 2,
      camera.h / 2,
      Math.max(camera.w, camera.h) * 0.7
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.16)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, camera.w, camera.h);
  }

  return { draw, screenToWorld };
}

function getObjectSortY(object) {
  if (object.sortY !== undefined) return object.sortY * TILE_SIZE;
  return (object.y * TILE_SIZE) + (object.drawH || TILE_SIZE);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
