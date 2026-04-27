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
      "Prototype controls: choose a character on the loading screen, then move with the right-side D-pad. The centre ACT button interacts. Desktop uses WASD/arrows and E/Enter/Space. Walk directly into glowing entrance tiles to change maps."
    );
  });

  return api;
}
