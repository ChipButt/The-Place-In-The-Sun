const SAVE_KEY = "roll_britannia_nassau_save_v1";

export function hasSavedGame() {
  try { return Boolean(localStorage.getItem(SAVE_KEY)); }
  catch { return false; }
}

export function loadGameSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Could not load save", error);
    return null;
  }
}

export function writeGameSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn("Could not write save", error);
    return false;
  }
}

export function clearGameSave() {
  try { localStorage.removeItem(SAVE_KEY); }
  catch (error) { console.warn("Could not clear save", error); }
}
