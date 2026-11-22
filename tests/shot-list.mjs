// The scenes browser.mjs --shots captures, in contact-sheet order; the first one is the cover.

/**
 * name: the ?shot= scene in game/src/shots*.js; file: where it lands under screenshots/. One thing a cell:
 * the story's last job, the whole open world at that point, progression, a fight on foot. shop, title and heist
 * are debug scenes.
 */
export const SHOT_LIST = Object.freeze([
  { name: 'mission', file: '1-mission.jpg' },
  { name: 'map', file: '2-map.jpg' },
  { name: 'progress', file: '3-progress.jpg' },
  { name: 'combat', file: '4-fight.jpg' },
].map(Object.freeze));
