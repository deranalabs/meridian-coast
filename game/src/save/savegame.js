// Save format: versioned JSON of cash, weapons, outfit, cars, position, time, story and the packages found;
// tolerant of bad data.
import { WEAPONS } from '../combat/weapons.js';
import { createProgress, cleanProgress } from '../missions/progress.js';
import { cleanFound } from '../economy/packages.js';

export const SAVE_VERSION = 2;
const TIMES = ['dusk', 'night'];
const CAR_TYPES = ['sedan', 'coupe', 'pickup'];
const HEX = /^#[0-9a-f]{6}$/i;

const number = (value, fallback, min = -Infinity, max = Infinity) =>
  (typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback);
const integer = (value, fallback, min, max) => Math.round(number(value, fallback, min, max));

/** The default state a new game starts from. */
export function defaultSave() {
  return {
    version: SAVE_VERSION,
    cash: 2480,
    health: 100,
    armour: 0,
    weapons: { fists: { clip: 0, reserve: 0 } },
    current: 'fists',
    outfit: null,
    cars: [],
    position: null,
    time: 'dusk',
    clock: 0,
    savedAt: 0,
    packages: [],
    missions: createProgress(),
  };
}

function cleanWeapons(raw) {
  const out = { fists: { clip: 0, reserve: 0 } };
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, slot] of Object.entries(raw)) {
    const weapon = WEAPONS[id];
    if (!weapon || weapon.melee || !slot || typeof slot !== 'object') continue;
    out[id] = { clip: integer(slot.clip, weapon.clip, 0, weapon.clip), reserve: integer(slot.reserve, 0, 0, 999) };
  }
  return out;
}

function cleanOutfit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const slot of ['hair', 'top', 'bottom', 'outer']) {
    if (Number.isInteger(raw[slot]) && raw[slot] >= 0 && raw[slot] <= 99) out[slot] = raw[slot];
  }
  const colours = {};
  for (const [name, value] of Object.entries(raw.colours ?? {})) if (HEX.test(String(value))) colours[name] = value;
  out.colours = colours;
  return out;
}

function cleanCars(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((car) => car && CAR_TYPES.includes(car.type)).slice(0, 6)
    .map((car) => ({ type: car.type, colour: HEX.test(String(car.colour)) ? car.colour : '#c0c5ce' }));
}

function cleanPosition(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = number(raw.x, NaN, -900, 900);
  const z = number(raw.z, NaN, -900, 900);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, z, heading: number(raw.heading, 0, -10, 10) };
}

/** Old saves: version 1 stored cash and a flat position. */
function migrate(raw) {
  if (raw.version === 1) return { ...raw, version: 2, position: { x: raw.x, z: raw.z, heading: 0 } };
  return raw;
}

/** Turn any parsed value into a valid save, filling what is missing or broken from the defaults. */
export function normalise(input) {
  const base = defaultSave();
  if (!input || typeof input !== 'object') return base;
  const raw = migrate(input);
  const weapons = cleanWeapons(raw.weapons);
  return {
    version: SAVE_VERSION,
    cash: integer(raw.cash, base.cash, 0, 99999999),
    health: integer(raw.health, 100, 1, 100),
    armour: integer(raw.armour, 0, 0, 100),
    weapons,
    current: weapons[raw.current] ? raw.current : 'fists',
    outfit: cleanOutfit(raw.outfit),
    cars: cleanCars(raw.cars),
    position: cleanPosition(raw.position),
    time: TIMES.includes(raw.time) ? raw.time : 'dusk',
    clock: number(raw.clock, 0, 0, 1e7),
    savedAt: number(raw.savedAt, 0, 0, 1e15),
    packages: cleanFound(raw.packages),
    missions: cleanProgress(raw.missions),
  };
}

export function serialise(save) {
  return JSON.stringify({ ...normalise(save), version: SAVE_VERSION });
}

/** Parse saved text: {save, status} where status is 'ok', 'empty', 'corrupt' or 'future'. */
export function parseSave(text) {
  if (typeof text !== 'string' || text.length === 0) return { save: defaultSave(), status: 'empty' };
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { save: defaultSave(), status: 'corrupt' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { save: defaultSave(), status: 'corrupt' };
  if (Number(raw.version) > SAVE_VERSION) return { save: defaultSave(), status: 'future' };
  return { save: normalise(raw), status: 'ok' };
}
