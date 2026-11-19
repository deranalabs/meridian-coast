// Theme: publishes the palette's UI tokens and faction colours as CSS variables (--mc-gold, --mc-faction-salt-dogs).
import { UI_TOKENS, FACTION_INFO } from '../palette.js';

/** camelCase token to its CSS variable name: policeRed → --mc-police-red. */
export const cssName = (key) => `--mc-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** Every variable the HUD and menus may use, as [name, value] pairs. */
export function themeVariables() {
  const pairs = Object.entries(UI_TOKENS).map(([key, value]) => [cssName(key), value]);
  for (const [id, faction] of Object.entries(FACTION_INFO)) {
    pairs.push([cssName(`faction-${id}`), faction.colour], [cssName(`faction-${id}-shade`), faction.shade]);
  }
  return pairs;
}

/** Writes the variables on the document root once at boot. */
export function applyTheme(root = document.documentElement) {
  for (const [name, value] of themeVariables()) root.style.setProperty(name, value);
}
