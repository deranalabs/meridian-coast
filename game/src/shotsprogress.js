// Progress screenshot scene: a late save in Palmetto Beach at dusk with the pause menu open on its Progress page.
import { STORY_POINTS, seedStory, storySaveText } from './shotsstory.js';
import { PLACES } from './data/places.js';
import { parseSave } from './save/savegame.js';

const CLOTHES = PLACES.find((place) => place.id === 'clothes');
const STEPS = 30;

export const PROGRESS_SHOTS = {
  progress: {
    time: 'dusk',
    steps: STEPS,
    focus: [CLOTHES.near[0], 0, CLOTHES.near[1]],
    stage(game) {
      seedStory(game, STORY_POINTS.garage);
      // Ilo on the pavement outside Saltwater Threads, a few steps from the door.
      const place = game.services.shops.places.find((entry) => entry.id === CLOTHES.id);
      game.player.placeOnFoot(place.x + place.outX * 2.5, place.z + place.outZ * 2.5, place.heading);
      return { pausePage: 'progress', storedSave: parseSave(storySaveText(STORY_POINTS.garage)) };
    },
  },
};
