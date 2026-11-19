// Save storage: reads and writes the save text in localStorage, surviving blocked or full storage quietly.

export const SAVE_KEY = 'meridian-coast.save';

/** The saved text, or '' when there is none or storage is unavailable. */
export function readSaveText(key = SAVE_KEY) {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Write the save text; returns false when storage refused it. */
export function writeSaveText(text, key = SAVE_KEY) {
  try {
    window.localStorage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}

export function clearSave(key = SAVE_KEY) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to clear.
  }
}
