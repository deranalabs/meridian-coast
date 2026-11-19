// Shared palette tokens, units and part names: district accents, factions, skin tones and rig part ids.

/** World units: 1 unit is 1 metre, time is in seconds, angles in radians. */
export const UNITS = Object.freeze({
  metre: 1,
  personHeight: 1.75,
  headsTall: 7.3,
  laneWidth: 3.5,
  kerbHeight: 0.16,
  storeyHeight: 3.4,
});

/** The city's name and the districts' display names, used by the HUD, minimap and missions. */
export const CITY_NAME = 'Port Meridian';
export const GAME_TITLE = 'Meridian Coast';

export const DISTRICTS = Object.freeze({
  harbor: { name: 'Harbor Row', accent: '#ff8a3d', accent2: '#2ec4c9', stucco: '#9a8f86' },
  beach: { name: 'Palmetto Beach', accent: '#ff5fa2', accent2: '#3fe0d0', stucco: '#f2d7c4' },
  heights: { name: 'Calder Heights', accent: '#f2b84b', accent2: '#c0583a', stucco: '#e6c9a3' },
  neon: { name: 'Neon Mile', accent: '#c45cff', accent2: '#ff3d7f', stucco: '#8d8fa6' },
});

/** Faction colours for later gang, police and mission systems. */
export const FACTIONS = Object.freeze({
  player: '#6a7a45',
  police: '#1d3d8f',
  policeLight: '#3b6bff',
  policeSiren: '#ff2a4a',
  saltDogs: '#2ec4c9',
  velvetHand: '#c45cff',
  calderCrew: '#f2b84b',
  gildedWake: '#ff8a5c',
});

/** The four story factions: display name, colour, and a darker shade for card borders and portrait backs. */
export const FACTION_INFO = Object.freeze({
  saltDogs: { name: 'Salt Dogs', colour: FACTIONS.saltDogs, shade: '#136c70', turf: 'harbor' },
  velvetHand: { name: 'Velvet Hand', colour: FACTIONS.velvetHand, shade: '#5e2382', turf: 'neon' },
  calderCrew: { name: 'Calder Crew', colour: FACTIONS.calderCrew, shade: '#7f5a17', turf: 'heights' },
  gildedWake: { name: 'Gilded Wake', colour: FACTIONS.gildedWake, shade: '#8a3a1c', turf: 'beach' },
});

/** HUD and menu tokens (mission gold, a neutral tint, panel ink, police lamps); ui/theme.js makes CSS variables. */
export const UI_TOKENS = Object.freeze({
  gold: '#ffc94a',
  goldDeep: '#a8741a',
  uiTint: '#9fb7c9',
  uiInk: '#120a24',
  uiDeep: 'rgba(14, 8, 30, 0.8)',
  cash: '#9dffb5',
  policeRed: FACTIONS.policeSiren,
  policeBlue: '#6f97ff',
  policeAmber: '#ffb03a',
});

/** Five skin tones from light to deep, in linear-friendly sRGB hex. */
export const SKIN_TONES = Object.freeze(['#f1c9a5', '#d9a47c', '#b07850', '#8a5636', '#5c3824']);

export const HAIR_COLOURS = Object.freeze([
  '#1b1410', '#3b2516', '#6b4424', '#a8763e', '#d9c08a', '#8c8c8c', '#b5322c',
]);

/** Ilo Rask's fixed outfit colours. */
export const ILO = Object.freeze({
  bomber: '#6a7a45',
  lining: '#ff7a1a',
  tee: '#e9e4d6',
  jeans: '#2c3546',
  hiTops: '#efe6cf',
  hair: '#1b1410',
  skin: SKIN_TONES[2],
});

/** Per-district clothing palettes the wardrobe draws pedestrian outfits from. */
export const WARDROBE_PALETTES = Object.freeze({
  harbor: ['#3d4a5c', '#7a5236', '#c46a2e', '#d8d2c4', '#4f5e3a', '#2b2b2e', '#9c3b2c'],
  beach: ['#ff7fae', '#3fd0c4', '#fff1d6', '#ffd166', '#7ec8ff', '#f45b69', '#ffffff'],
  heights: ['#e3c18f', '#8e4b32', '#4b5d3a', '#f4ead6', '#355c7d', '#c9783f', '#2f2a26'],
  neon: ['#111116', '#c45cff', '#e8e8ee', '#ff3d7f', '#2a2f45', '#5d6dff', '#d9b26a'],
});

export const CAR_PAINTS = Object.freeze([
  '#d7263d', '#f4f1ea', '#1b1e24', '#2e86ab', '#f6ae2d', '#4f9d69',
  '#8e5ea2', '#c0c5ce', '#ff6f59', '#2a3d66', '#e9c46a', '#5a2a27',
]);

/** Sky and grade colours the renderer and post passes share. */
export const SKY = Object.freeze({
  duskZenith: '#2a1b4a',
  duskMid: '#7b3f86',
  duskHorizon: '#ff9a6a',
  duskSun: '#ffd6a0',
  nightZenith: '#05060f',
  nightHorizon: '#2a1840',
  hazeDusk: '#b0698e',
  hazeNight: '#241a3a',
});

/** The 17 rig parts, in parent-before-child order; the index is the bone id the crowd shader reads. */
/** The listed body parts are 16; the 17th is the abdomen, a spine joint between pelvis and torso. */
export const PART_NAMES = Object.freeze([
  'pelvis', 'abdomen', 'torso', 'neck', 'head',
  'upperArmL', 'forearmL', 'handL',
  'upperArmR', 'forearmR', 'handR',
  'thighL', 'shinL', 'shoeL',
  'thighR', 'shinR', 'shoeR',
]);

export const PART = Object.freeze(Object.fromEntries(PART_NAMES.map((name, index) => [name, index])));

/** Wardrobe slots: body is always drawn, every other slot shows one chosen variant (or none). */
export const SLOTS = Object.freeze(['body', 'hair', 'top', 'bottom', 'outer', 'shoes', 'accessory']);
export const SLOT = Object.freeze(Object.fromEntries(SLOTS.map((name, index) => [name, index])));

/** Colour channels a character's palette fills; geometry names one per vertex. */
export const COLOUR_CHANNELS = Object.freeze([
  'skin', 'hair', 'top', 'topTrim', 'bottom', 'shoe', 'shoeSole', 'outer', 'outerLining', 'accent', 'detail',
]);
export const COLOUR = Object.freeze(Object.fromEntries(COLOUR_CHANNELS.map((name, index) => [name, index])));
