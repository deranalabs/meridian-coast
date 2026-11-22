// Story assembly: resolves the story places, builds the mission director and connects it to the HUD and saves.
import { ACTIVITIES } from './activities/index.js';
import { createRespect } from './respect.js';
import { STORY_MISSIONS } from './story/index.js';
import { createMissions } from './director.js';
import { MISSION_PLACES } from '../data/places.js';
import { findPlaces } from '../world/placefinder.js';
import { createDialogue } from './dialogue.js';
import { createMissionKit } from './kit.js';
import { castMember } from '../data/cast.js';
import * as THREE from '../../vendor/three.module.min.js';
import { storyPiece } from '../data/clothing.js';
import { costume, dressed } from '../shops/outfit.js';

/** Restyle Ilo in `outfit` over his base look (a story costume on, or his own clothes back). */
function showOutfit(game, outfit) {
  game.characters.restyle(game.ilo, dressed(game.baseLook, outfit, (hex) => new THREE.Color(hex)));
}

/** Every place a mission may name: the story spots plus the shops and services already on the map. */
export function storyPlaces(game) {
  const map = new Map();
  for (const place of game.services.shops.places) map.set(place.id, place);
  for (const place of findPlaces(game.city.layout, MISSION_PLACES)) {
    map.set(place.id, { ...place, y: game.ground.surfaceAt(place.x, place.z).height });
  }
  return map;
}

/**
 * The mission director for a game that already has its services, with its dialogue (game.dialogue); extra
 * hooks override the defaults. The director's update also steps the dialogue.
 */
export function createStory(game, extra = {}) {
  const places = storyPlaces(game);
  const dialogue = createDialogue(game);
  game.dialogue = dialogue;
  const hooks = {
    say: (html, seconds, kind) => game.hud.say(html, seconds, kind),
    unsay: (kind) => game.hud.messages.drop(kind),
    save: () => game.services.save(),
    onEvent: (name, data) => game.action.events.emit(`mission-${name}`, data),
    talk: (lines, done, options) => dialogue.talk(lines, done, options),
    hush: () => dialogue.clear(),
    cast: castMember,
    kit: createMissionKit(game, places),
    dress: (ids) => showOutfit(game, costume(game.outfit, ids.map(storyPiece))),
    undress: () => showOutfit(game, game.outfit),
    ...extra,
  };
  const events = game.action.events;
  const effects = game.action.effects;
  const feet = () => ({ x: game.ilo.position.x, y: game.ilo.position.y, z: game.ilo.position.z });
  events.on('mission-complete', (e) => effects?.celebrate?.(game.player.state.car?.position ?? feet(), e.colour));
  events.on('mission-failed', () => effects?.failBurst?.(game.player.state.car?.position ?? feet()));
  const missions = createMissions(game, extra.missions ?? [...STORY_MISSIONS, ...ACTIVITIES], places, hooks);
  missions.places = places;
  game.respect = createRespect(() => missions.progress);
  return missions;
}
