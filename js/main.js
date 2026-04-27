import { loadGameImages } from "./assets.js";
import { Game } from "./game.js";

const canvas = document.getElementById("gameCanvas");

boot();

async function boot() {
  try {
    const images = await loadGameImages();
    const game = new Game(canvas, images);
    game.start();
  } catch (error) {
    console.error(error);
    showFatalError(error);
  }
}

function showFatalError(error) {
  const message = document.createElement("pre");
  message.style.position = "fixed";
  message.style.inset = "20px";
  message.style.zIndex = "999";
  message.style.padding = "16px";
  message.style.overflow = "auto";
  message.style.whiteSpace = "pre-wrap";
  message.style.background = "#fff1f2";
  message.style.color = "#7f1d1d";
  message.style.border = "3px solid #991b1b";
  message.style.borderRadius = "16px";
  message.textContent = `The prototype could not start.\n\n${error.message}\n\nCheck that the assets/images folders were uploaded exactly as supplied in the ZIP.`;

  document.body.appendChild(message);
}
