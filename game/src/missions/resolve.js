// Mission definitions against the map: place ids in stages become points, and every stage is checked once.
import { OBJECTIVE_TYPES } from './objectives.js';

/** A point from a place id string, an {x, z} object, or null; `places` maps id to a resolved place. */
export function pointOf(at, places) {
  if (!at) return null;
  if (typeof at === 'string') {
    const place = places.get(at);
    if (!place) throw new Error(`Unknown mission place: ${at}`);
    return { x: place.x, y: place.y ?? 0, z: place.z, heading: place.heading, name: place.name };
  }
  return { x: at.x, y: at.y ?? 0, z: at.z, heading: at.heading ?? 0 };
}

/** A copy of `def` with stage points, leashes and the start resolved; throws on a malformed stage. */
export function resolveMission(def, places) {
  const stages = def.stages.map((stage, index) => {
    if (!OBJECTIVE_TYPES[stage.type]) throw new Error(`${def.id} stage ${index}: unknown type ${stage.type}`);
    if (!stage.text) throw new Error(`${def.id} stage ${index}: no objective text`);
    const out = { ...stage, at: pointOf(stage.at, places), start: pointOf(stage.start, places) };
    if (stage.leash) out.leash = { metres: stage.leash.metres, at: pointOf(stage.leash.at, places) };
    if (['goto', 'drive', 'deliver'].includes(stage.type) && !out.at && !stage.target) {
      throw new Error(`${def.id} stage ${index}: ${stage.type} needs a place or a target`);
    }
    if (['race', 'follow'].includes(stage.type) && !stage.target) {
      throw new Error(`${def.id} stage ${index}: ${stage.type} needs a target`);
    }
    if (stage.type === 'buy' && !stage.item?.startsWith('gear:')) {
      throw new Error(`${def.id} stage ${index}: buy needs a gear item`);
    }
    return out;
  });
  return { ...def, stages, startAt: pointOf(def.startAt, places) };
}
