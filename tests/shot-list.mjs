// The scenes browser.mjs --shots captures, in contact-sheet order; the first one is the cover.

/**
 * name: the ?shot= scene in game/src/shots*.js; file: where it lands under screenshots/. One system a cell: the
 * cover's street chase (police, Air-1, traffic, the job card, the radio), a job on foot in another district at
 * sunset, a shop's prices, and the Progress page. map, combat, title, heist and missionRain stay debug scenes.
 */
export const SHOT_LIST = Object.freeze([
  { name: 'mission', file: '1-mission.jpg' },
  { name: 'street', file: '2-street.jpg' },
  { name: 'shop', file: '3-shop.jpg' },
  { name: 'progress', file: '4-progress.jpg' },
].map(Object.freeze));
