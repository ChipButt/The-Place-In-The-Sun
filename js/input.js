export function createInput(canvas) {
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    lastDirection: null,
    interactPressed: false,
    inventoryPressed: false,
    tap: null
  };

  const keyToAction = new Map([
    ["arrowup", "up"],
    ["w", "up"],
    ["arrowdown", "down"],
    ["s", "down"],
    ["arrowleft", "left"],
    ["a", "left"],
    ["arrowright", "right"],
    ["d", "right"]
  ]);

  const interactKeys = new Set(["e", "enter", " "]);

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (keyToAction.has(key)) {
      const action = keyToAction.get(key);
      state[action] = true;
      state.lastDirection = action;
      event.preventDefault();
    }

    if (interactKeys.has(key)) {
      state.interactPressed = true;
      event.preventDefault();
    }

    if (key === "i" || key === "b") {
      state.inventoryPressed = true;
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();

    if (keyToAction.has(key)) {
      const action = keyToAction.get(key);
      state[action] = false;
      refreshLastDirection(state, action);
      event.preventDefault();
    }
  }, { passive: false });

  setupMobileControls(state);
  setupCanvasTap(canvas, state);
  setupFullscreenButtons();
  preventMobileBrowserGestures();

  return {
    state,
    consumeInteract() {
      if (!state.interactPressed) return false;
      state.interactPressed = false;
      return true;
    },
    consumeInventory() {
      if (!state.inventoryPressed) return false;
      state.inventoryPressed = false;
      return true;
    },
    consumeTap() {
      if (!state.tap) return null;
      const tap = state.tap;
      state.tap = null;
      return tap;
    }
  };
}

function setupMobileControls(state) {
  const buttons = document.querySelectorAll("[data-dir]");
  for (const button of buttons) {
    const direction = button.dataset.dir;

    const press = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      state[direction] = true;
      state.lastDirection = direction;
    };

    const release = (event) => {
      event.preventDefault();
      state[direction] = false;
      refreshLastDirection(state, direction);
    };

    button.addEventListener("pointerdown", press, { passive: false });
    button.addEventListener("pointerup", release, { passive: false });
    button.addEventListener("pointercancel", release, { passive: false });
    button.addEventListener("pointerleave", release, { passive: false });
    button.addEventListener("lostpointercapture", release, { passive: false });
  }

  const interactButton = document.getElementById("interactButton");
  if (interactButton) {
    interactButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.interactPressed = true;
    }, { passive: false });
  }

  const inventoryButtons = [
    document.getElementById("inventoryButton"),
    document.getElementById("mobileInventoryButton")
  ].filter(Boolean);

  for (const button of inventoryButtons) {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.inventoryPressed = true;
    }, { passive: false });
  }
}

function refreshLastDirection(state, releasedDirection) {
  if (state.lastDirection !== releasedDirection) return;

  if (state.up) state.lastDirection = "up";
  else if (state.down) state.lastDirection = "down";
  else if (state.left) state.lastDirection = "left";
  else if (state.right) state.lastDirection = "right";
  else state.lastDirection = null;
}

function setupCanvasTap(canvas, state) {
  let start = null;

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    start = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
    canvas.setPointerCapture?.(event.pointerId);
  }, { passive: false });

  canvas.addEventListener("pointerup", (event) => {
    if (!start || start.pointerId !== event.pointerId) return;
    event.preventDefault();

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.hypot(dx, dy);
    const age = performance.now() - start.time;

    if (distance <= 16 && age <= 700) {
      state.tap = { x: event.clientX, y: event.clientY };
    }

    start = null;
  }, { passive: false });

  canvas.addEventListener("pointercancel", () => {
    start = null;
  }, { passive: false });
}

function setupFullscreenButtons() {
  const buttons = [
    document.getElementById("fullscreenButton"),
    document.getElementById("mobileFullscreenButton")
  ].filter(Boolean);

  for (const button of buttons) {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      await enterFullscreenAndLockLandscape();
    });
  }
}

async function enterFullscreenAndLockLandscape() {
  const shell = document.getElementById("gameShell") || document.documentElement;

  try {
    if (!document.fullscreenElement && shell.requestFullscreen) {
      await shell.requestFullscreen({ navigationUI: "hide" });
    }
  } catch (error) {
    console.warn("Fullscreen request was blocked or unsupported.", error);
  }

  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  } catch (error) {
    console.warn("Landscape lock was blocked or unsupported.", error);
  }
}

function preventMobileBrowserGestures() {
  window.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  window.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
  window.addEventListener("gesturechange", (event) => event.preventDefault(), { passive: false });
  window.addEventListener("gestureend", (event) => event.preventDefault(), { passive: false });
  window.addEventListener("dblclick", (event) => event.preventDefault(), { passive: false });
}
