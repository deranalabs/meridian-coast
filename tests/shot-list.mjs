// The scenes browser.mjs --shots captures, in contact-sheet order; the first one is the cover.

/**
 * name: the ?shot= scene in game/src/shots*.js; file: where it lands under screenshots/. One thing a cell:
 * the story's last job, a fight in another job, progression, the economy. map, title and heist are debug scenes.
 */
export const SHOT_LIST = Object.freeze([
  { name: 'mission', file: '1-mission.jpg' },
  { name: 'combat', file: '2-fight.jpg' },
  { name: 'progress', file: '3-progress.jpg' },
  { name: 'shop', file: '4-shop.jpg' },
].map(Object.freeze));
