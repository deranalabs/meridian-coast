// Respect and unlocks: what each street rank opens in the shops (weapons, cars, clothes), and the shop lock check.
import { RANKS, rankFor } from './progress.js';
import { WEAPONS } from '../combat/weapons.js';
import { CAR_TYPES } from '../vehicles/carmodels.js';
import { CLOTHING } from '../data/clothing.js';

/** Shop item ids each rank opens; an item not listed here is open from the start. */
export const RANK_UNLOCKS = Object.freeze({
  Runner: ['wear:windbreaker', 'wear:pink-blazer'],
  'Known Face': ['weapon:smg', 'car:pickup'],
  Earner: ['weapon:shotgun', 'car:coupe', 'wear:sun-hat'],
  'Harbour Name': ['wear:gilt-blazer'],
  'Tide Caller': ['wear:tide-cap'],
});

const NEEDS = new Map(Object.entries(RANK_UNLOCKS).flatMap(([rank, ids]) => ids.map((id) => [id, rank])));

/** The rank name an item id needs, or null when it is open from the start. */
export const rankNeeded = (id) => NEEDS.get(id) ?? null;

const rankIndex = (name) => RANKS.findIndex((rank) => rank.name === name);

/** '' when `respect` is enough for item `id`, else the reason the shop shows ('Rank: Earner'). */
export function lockReason(id, respect) {
  const needed = rankNeeded(id);
  if (!needed) return '';
  return rankIndex(rankFor(respect).name) >= rankIndex(needed) ? '' : `Rank: ${needed}`;
}

/** The next rank above `respect` with what it opens, or null at the top. */
export function nextUnlock(respect) {
  const next = RANKS.find((rank) => rank.respect > respect);
  if (!next) return null;
  return { name: next.name, respect: next.respect, needed: next.respect - respect,
    opens: RANK_UNLOCKS[next.name] ?? [] };
}

/** A shop item id as the menus name it ('weapon:smg' becomes 'Ratchet SMG'). */
export function unlockLabel(id) {
  const [type, key] = id.split(':');
  if (type === 'weapon') return WEAPONS[key]?.name ?? key;
  if (type === 'car') return CAR_TYPES[key]?.name ?? key;
  return CLOTHING.find((piece) => piece.id === key)?.name ?? key;
}

/** Everything `respect` has opened so far, in rank order. */
export function unlockedItems(respect) {
  const reached = rankIndex(rankFor(respect).name);
  return RANKS.slice(0, reached + 1).flatMap((rank) => RANK_UNLOCKS[rank.name] ?? []);
}

/** Respect over a live progress getter, for the shops (`lockedBy`) and the menus. */
export function createRespect(progress) {
  return {
    lockedBy: (id) => lockReason(id, progress().respect),
    get rank() {
      return rankFor(progress().respect);
    },
    get next() {
      return nextUnlock(progress().respect);
    },
  };
}
