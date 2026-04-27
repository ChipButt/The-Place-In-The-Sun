import { TILE_SIZE, PLAYER, DEBUG } from "./config.js";
import { SPRITES, PLAYER_ANIMS } from "./assets.js";
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

  function draw(map, player) {
    resize();
    updateCamera(map, player);

    ctx.clearRect(0, 0, camera.w, camera.h);
    ctx.fillStyle = "#0c4a6e";
    ctx.fillRect(0, 0, camera.w, camera.h);

    drawGround(map);
    drawPortalHints(map);

    const drawables = [
      ...(map.objects || []).map((object) => ({ kind: "object", data: object, sortY: getObjectSortY(object) })),
      ...(map.npcs || []).map((npc) => ({ kind: "npc", data: npc, sortY: (npc.y * TILE_SIZE) + (npc.drawH || 58) })),
      { kind: "player", data: player, sortY: player.y + PLAYER.drawHeight / 2 }
    ].sort((a, b) => a.sortY - b.sortY);

    for (const item of drawables) {
      if (item.kind === "object") drawObject(item.data);
      if (item.kind === "npc") drawNpc(item.data);
      if (item.kind === "player") drawPlayer(item.data);
    }

    if (DEBUG.showCollision) drawCollisionDebug(map, player);
    if (DEBUG.showPortalZones) drawPortalDebug(map);

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

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tileId = map.ground[y][x];
        const spriteKey = TILE_DEFS[tileId]?.sprite || "grass";
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

  function drawObject(object) {
    if (object.sprite === "caveMouth") {
      drawCaveMouth(object);
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
      npc.sprite || "playerDown1",
      npc.x * TILE_SIZE - camera.x,
      npc.y * TILE_SIZE - camera.y,
      npc.drawW || PLAYER.drawWidth,
      npc.drawH || PLAYER.drawHeight
    );
  }

  function drawPlayer(player) {
    const frames = PLAYER_ANIMS[player.direction] || PLAYER_ANIMS.down;
    const frameIndex = player.moving ? Math.floor(player.animTime * 8) % frames.length : 1;
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

    ctx.drawImage(image, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
  }

  function drawCaveMouth(object) {
    const x = object.x * TILE_SIZE - camera.x;
    const y = object.y * TILE_SIZE - camera.y;
    const w = object.drawW || 120;
    const h = object.drawH || 100;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));

    ctx.fillStyle = "#5b4636";
    roundedRect(ctx, 0, 22, w, h - 22, 18);
    ctx.fill();

    ctx.fillStyle = "#2f241c";
    roundedRect(ctx, 9, 32, w - 18, h - 30, 16);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    roundedRect(ctx, 27, 42, w - 54, h - 42, 18);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 244, 199, 0.28)";
    ctx.fillRect(24, h - 14, w - 48, 8);

    ctx.restore();
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
      if (!object.solid) continue;
      const box = getObjectHitbox(object);
      ctx.strokeRect(box.x - camera.x, box.y - camera.y, box.w, box.h);
    }

    for (const npc of map.npcs || []) {
      const box = getNpcHitbox(npc);
      ctx.strokeRect(box.x - camera.x, box.y - camera.y, box.w, box.h);
    }

    const pbox = getPlayerHitbox(player);
    ctx.strokeStyle = "rgba(0,255,255,0.9)";
    ctx.strokeRect(pbox.x - camera.x, pbox.y - camera.y, pbox.w, pbox.h);
    ctx.restore();
  }

  function drawPortalDebug(map) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,0,0.9)";
    ctx.lineWidth = 2;

    for (const portal of map.portals || []) {
      const rect = getPortalRect(portal);
      ctx.strokeRect(rect.x - camera.x, rect.y - camera.y, rect.w, rect.h);
    }

    ctx.restore();
  }

  function drawVignette() {
    const gradient = ctx.createRadialGradient(
      camera.w / 2,
      camera.h / 2,
      Math.min(camera.w, camera.h) * 0.25,
      camera.w / 2,
      camera.h / 2,
      Math.max(camera.w, camera.h) * 0.75
    );

    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.18)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, camera.w, camera.h);
  }

  return { draw, camera, screenToWorld };
}

function getObjectSortY(object) {
  if (object.hitbox) return (object.hitbox.y + object.hitbox.h) * TILE_SIZE;
  return (object.y * TILE_SIZE) + (object.drawH || TILE_SIZE);
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
