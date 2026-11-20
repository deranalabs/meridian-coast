// The scenes browser.mjs --shots captures, in contact-sheet order; the first one is the cover.

/** name: the ?shot= scene in game/src/shots*.js; file: where it lands under screenshots/. */
export const SHOT_LIST = Object.freeze([
  { name: 'mission', file: '1-mission.jpg' },
  { name: 'map', file: '2-map.jpg' },
  { name: 'heist', file: '3-heist.jpg' },
  { name: 'combat', file: '4-combat.jpg' },
].map(Object.freeze));
