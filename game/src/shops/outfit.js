// Outfits: Ilo's chosen wardrobe slots and colours, applied on top of the base look; saved as indices and hex.
import { HAIR_STYLES, TOPS, BOTTOMS, OUTERWEAR, NONE } from '../actors/wardrobe.js';

const SLOT_LISTS = { hat: HAIR_STYLES, top: TOPS, bottom: BOTTOMS, outer: OUTERWEAR };
const SAVE_SLOT = { hat: 'hair', top: 'top', bottom: 'bottom', outer: 'outer' };
const CHANNEL = { hat: 'accent', top: 'top', bottom: 'bottom', outer: 'outer' };

/** The outfit an item would give: a copy of `outfit` with the item's slot, style and colours set. */
export function withItem(outfit, item) {
  const next = { ...outfit, colours: { ...(outfit.colours ?? {}) } };
  const key = SAVE_SLOT[item.slot];
  next[key] = item.style === null ? NONE : SLOT_LISTS[item.slot].indexOf(item.style);
  if (item.colour) next.colours[CHANNEL[item.slot]] = item.colour;
  if (item.slot === 'top' && item.colour) next.colours.topTrim = item.colour;
  if (item.lining) next.colours.outerLining = item.lining;
  return next;
}

/** Whether `outfit` already wears `item` (same style and colour). */
export function wears(outfit, item) {
  const key = SAVE_SLOT[item.slot];
  const index = item.style === null ? NONE : SLOT_LISTS[item.slot].indexOf(item.style);
  if (outfit[key] !== undefined && outfit[key] !== index) return false;
  if (outfit[key] === undefined) return false;
  return !item.colour || outfit.colours?.[CHANNEL[item.slot]] === item.colour;
}

/** Apply an outfit to a base appearance; `makeColour(hex)` builds a colour object (THREE.Color in the game). */
export function dressed(base, outfit, makeColour) {
  const variants = { ...base.variants };
  for (const key of ['hair', 'top', 'bottom', 'outer']) {
    if (Number.isInteger(outfit?.[key])) variants[key] = outfit[key];
  }
  const colours = { ...base.colours };
  for (const [name, hex] of Object.entries(outfit?.colours ?? {})) if (colours[name]) colours[name] = makeColour(hex);
  return { ...base, variants, colours };
}

/** The starting outfit (Ilo's own clothes) expressed as saved slots. */
export function baseOutfit(base) {
  return { hair: base.variants.hair, top: base.variants.top, bottom: base.variants.bottom, outer: base.variants.outer,
    colours: {} };
}
