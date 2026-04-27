export function createDialogue() {
  const box = document.getElementById("dialogueBox");
  const text = document.getElementById("dialogueText");
  const close = document.getElementById("dialogueClose");
  const help = document.getElementById("helpButton");

  let active = false;

  const api = {
    get active() {
      return active;
    },

    show(message) {
      text.textContent = message;
      box.classList.remove("hidden");
      active = true;
    },

    close() {
      box.classList.add("hidden");
      text.textContent = "";
      active = false;
    }
  };

  close.addEventListener("click", () => api.close());

  help.addEventListener("click", () => {
    api.show(
      "Prototype controls: mobile uses the right-side D-pad and tap-to-interact. Desktop uses WASD/arrows, Shift to run, and E/Enter/Space to interact. The goal is to prove the mobile-first tilemap engine before building out Nassau properly."
    );
  });

  return api;
}
