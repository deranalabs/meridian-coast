// The scenes browser.mjs --shots captures, in contact-sheet order; the first one is the cover.

/** name: the ?shot= scene in game/src/shots*.js; file: where it lands under screenshots/. */
export const SHOT_LIST = Object.freeze([
  { name: 'police', file: '1-police.jpg' },
  { name: 'drive', file: '2-drive.jpg' },
  { name: 'shop', file: '3-shop.jpg' },
  { name: 'combat', file: '4-combat.jpg' },
].map(Object.freeze));
