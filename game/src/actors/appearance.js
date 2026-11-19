// Character appearances: random outfits from district palettes, and Ilo Rask's fixed look.
import * as THREE from '../../vendor/three.module.min.js';
import { SKIN_TONES, HAIR_COLOURS, WARDROBE_PALETTES, ILO, COLOUR_CHANNELS } from '../palette.js';
import { BUILDS } from './rig.js';
import { HAIR_STYLES, TOPS, BOTTOMS, OUTERWEAR, SHOES, ACCESSORIES, NONE } from './wardrobe.js';

const index = (list, name) => list.indexOf(name);

function colours(map) {
  const out = {};
  for (const name of COLOUR_CHANNELS) out[name] = new THREE.Color(map[name] ?? '#808080');
  return out;
}

const DISTRICT_TASTE = {
  beach: { outer: 0.05, shorts: 0.55, hat: 0.35, sunglasses: 0.4 },
  neon: { outer: 0.45, shorts: 0.1, hat: 0.1, sunglasses: 0.15 },
  harbor: { outer: 0.5, shorts: 0.1, hat: 0.35, sunglasses: 0.05 },
  heights: { outer: 0.25, shorts: 0.25, hat: 0.15, sunglasses: 0.15 },
};

/** A random pedestrian outfit for a district. */
export function randomAppearance(random, district = 'neon') {
  const palette = WARDROBE_PALETTES[district] ?? WARDROBE_PALETTES.neon;
  const taste = DISTRICT_TASTE[district] ?? DISTRICT_TASTE.neon;
  const hatStyles = ['cap', 'beanie', 'sunhat'];
  const bareStyles = HAIR_STYLES.filter((style) => !hatStyles.includes(style));
  const hair = random.chance(taste.hat) ? random.pick(hatStyles) : random.pick(bareStyles);
  let bottom = random.chance(taste.shorts) ? 'shorts' : random.pick(BOTTOMS);
  if (bottom === 'shorts' && district === 'neon' && random.chance(0.5)) bottom = 'jeans';
  const top = random.pick(TOPS);
  const outer = random.chance(taste.outer) ? random.pick(OUTERWEAR.slice(1)) : null;
  let accessory = null;
  if (random.chance(taste.sunglasses)) accessory = 'sunglasses';
  else if (random.chance(0.3)) accessory = random.pick(['backpack', 'bag', 'chain']);
  const darkDenim = random.pick(['#2c3546', '#3a4a66', '#1f2430', '#5a6a80']);
  const pickColour = () => random.pick(palette);
  return {
    build: random.pick(BUILDS),
    variants: {
      hair: index(HAIR_STYLES, hair),
      top: index(TOPS, top),
      bottom: index(BOTTOMS, bottom),
      outer: outer ? index(OUTERWEAR, outer) : NONE,
      shoes: random.int(0, SHOES.length - 1),
      accessory: accessory ? index(ACCESSORIES, accessory) : NONE,
    },
    colours: colours({
      skin: random.pick(SKIN_TONES),
      hair: random.pick(HAIR_COLOURS),
      top: pickColour(),
      topTrim: pickColour(),
      bottom: bottom === 'jeans' || bottom === 'cargo' ? darkDenim : pickColour(),
      shoe: random.pick(['#f2f0ea', '#1d1d20', '#7a4a2a', '#c0392b', '#3a5a8a']),
      shoeSole: random.pick(['#f4f1ea', '#d8d0c0', '#26262a']),
      outer: random.pick(['#2c2f38', '#5a6a80', '#7a5a3a', '#3a5a4a', '#8a2f3a', '#d8cfc0']),
      outerLining: random.pick(['#c45cff', '#2b2b2e', '#d9b26a', '#e8e2d6']),
      accent: random.pick(['#1b1b1f', '#c8a24a', '#e04a6a', '#3fd0c4', '#f2f0ea']),
      detail: '#1a1214',
    }),
  };
}

/** Ilo Rask: oversized olive bomber with orange lining over a cream tee, dark jeans, cream hi-tops. */
export function iloAppearance() {
  return {
    build: { name: 'ilo', height: 1.0, shoulder: 1.02, hips: 0.98, girth: 0.98, belly: 0.95 },
    variants: {
      hair: index(HAIR_STYLES, 'crop'),
      top: index(TOPS, 'tee'),
      bottom: index(BOTTOMS, 'jeans'),
      outer: index(OUTERWEAR, 'bomber'),
      shoes: index(SHOES, 'hitops'),
      accessory: index(ACCESSORIES, 'chain'),
    },
    colours: colours({
      skin: ILO.skin,
      hair: ILO.hair,
      top: ILO.tee,
      topTrim: ILO.tee,
      bottom: ILO.jeans,
      shoe: ILO.hiTops,
      shoeSole: '#f7f3e8',
      outer: ILO.bomber,
      outerLining: ILO.lining,
      accent: '#d4b25a',
      detail: '#1a1214',
    }),
  };
}
