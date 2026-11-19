// Story assembly: resolves the story places, builds the mission director and connects it to the HUD and saves.
import { MISSION_PLACES } from '../data/places.js';
import { findPlaces } from '../world/placefinder.js';
import { createMissions } from './director.js';
import { STORY_MISSIONS } from './story/index.js';

/** Every place a mission may name: the story spots plus the shops and services already on the map. */
export function storyPlaces(game) {
  const map = new Map();
  for (const place of game.services.shops.places) map.set(place.id, place);
  for (const place of findPlaces(game.city.layout, MISSION_PLACES)) {
    map.set(place.id, { ...place, y: game.ground.surfaceAt(place.x, place.z).height });
  }
  return map;
}

/** The mission director for a game that already has its services; extra hooks override the defaults. */
export function createStory(game, extra = {}) {
  const places = storyPlaces(game);
  const hooks = {
    say: (html, seconds, kind) => game.hud.say(html, seconds, kind),
    save: () => game.services.save(),
    onEvent: (name, data) => game.action.events.emit(`mission-${name}`, data),
    ...extra,
  };
  const missions = createMissions(game, extra.missions ?? STORY_MISSIONS, places, hooks);
  missions.places = places;
  return missions;
}
