// Cast looks: turns a cast member's named wardrobe pieces and hex colours into a rig appearance.
import * as THREE from '../../vendor/three.module.min.js';
import { SKIN_TONES, COLOUR_CHANNELS } from '../palette.js';
import { BUILDS } from './rig.js';
import { HAIR_STYLES, TOPS, BOTTOMS, OUTERWEAR, SHOES, ACCESSORIES, NONE } from './wardrobe.js';

const pick = (list, name) => (name ? Math.max(0, list.indexOf(name)) : NONE);

/** The hex colour of every channel for a cast member (used by the rig and by the portrait painter). */
export function castColours(person) {
  const look = person.look;
  const c = look.colours;
  return {
    skin: SKIN_TONES[look.skin] ?? SKIN_TONES[2],
    hair: look.hairColour,
    top: c.top,
    topTrim: c.topTrim ?? c.top,
    bottom: c.bottom,
    shoe: c.shoe,
    shoeSole: c.shoeSole ?? '#f2eee4',
    outer: c.outer ?? c.top,
    outerLining: c.outerLining ?? c.top,
    accent: c.accent ?? '#d4b25a',
    detail: c.detail ?? '#1a1214',
  };
}

/** A rig appearance for `person` from data/cast.js. */
export function castAppearance(person) {
  const look = person.look;
  const hex = castColours(person);
  const colours = {};
  for (const name of COLOUR_CHANNELS) colours[name] = new THREE.Color(hex[name] ?? '#808080');
  const build = BUILDS.find((entry) => entry.name === look.build) ?? BUILDS[1];
  return {
    build: { ...build, name: person.id },
    variants: {
      hair: pick(HAIR_STYLES, look.hair),
      top: pick(TOPS, look.top),
      bottom: pick(BOTTOMS, look.bottom),
      outer: pick(OUTERWEAR, look.outer),
      shoes: pick(SHOES, look.shoes),
      accessory: pick(ACCESSORIES, look.accessory),
    },
    colours,
  };
}
