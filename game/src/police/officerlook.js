// Port Meridian Police uniform: navy shirt with a gold badge, dark cargo trousers, cap or bare head, boots.
import * as THREE from '../../vendor/three.module.min.js';
import { SKIN_TONES, HAIR_COLOURS, COLOUR_CHANNELS, FACTIONS } from '../palette.js';
import { BUILDS } from '../actors/rig.js';
import { HAIR_STYLES, TOPS, BOTTOMS, OUTERWEAR, SHOES, NONE } from '../actors/wardrobe.js';

/** An officer's appearance; `random` is a seeded generator from core/random.js. */
export function officerAppearance(random) {
  const capped = random.chance(0.6);
  const map = {
    skin: random.pick(SKIN_TONES),
    hair: random.pick(HAIR_COLOURS.slice(0, 5)),
    top: FACTIONS.police,
    topTrim: '#d9b04a',
    bottom: '#151a26',
    shoe: '#111114',
    shoeSole: '#1d1d20',
    outer: '#1a2233',
    outerLining: '#2f6bff',
    accent: '#d9b04a',
    detail: '#1a1214',
  };
  const colours = {};
  for (const name of COLOUR_CHANNELS) colours[name] = new THREE.Color(map[name]);
  return {
    build: random.pick(BUILDS.slice(0, 4)),
    variants: {
      hair: HAIR_STYLES.indexOf(capped ? 'cap' : random.pick(['crop', 'buzz', 'bun'])),
      top: TOPS.indexOf('shirt'),
      bottom: BOTTOMS.indexOf('cargo'),
      outer: random.chance(0.5) ? OUTERWEAR.indexOf('vest') : NONE,
      shoes: SHOES.indexOf('boots'),
      accessory: NONE,
    },
    colours,
  };
}
