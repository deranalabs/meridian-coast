// Progress page data: every figure and line of the page, worked out from the game's data and the player's state.
import { STORY_MISSIONS } from '../missions/story/index.js';
import { ACTIVITIES } from '../missions/activities/index.js';
import { RANKS, availableMissions } from '../missions/progress.js';
import { rankProgress, nextUnlock, lockReason, rankNeeded, unlockLabel } from '../missions/respect.js';
import { PLACES, USABLE } from '../data/places.js';
import { WEAPON_PRICES } from '../data/prices.js';
import { castMember } from '../data/cast.js';
import { itemsFor, MAX_CARS } from '../shops/catalog.js';
import { DISTRICT_LIST } from '../world/districts.js';
import { FACTION_INFO } from '../palette.js';
import { STATIONS } from './radiocontent.js';
import { saveCardText, storyPoint } from './savecard.js';

/** Ilo's own doors: they open a menu but are not shops. */
const HOMES = new Set(['safehouse', 'garage']);
const isShop = (place) => USABLE.has(place.kind) && !HOMES.has(place.kind);

/** The shops the sale list reads, in order: one thing from each until it has three. */
const SALE_SHOPS = ['gun', 'dealer', 'clothes', 'spray', 'food'];
const SALE_COUNT = 3;

function figures({ progress, arsenal, cars }) {
  const guns = Object.keys(WEAPON_PRICES);
  const figure = (id, value, of, label, detail) => ({ id, value, of, label, detail });
  const rank = rankProgress(progress.respect);
  return [
    figure('jobs', STORY_MISSIONS.filter((def) => progress.done.includes(def.id)).length, STORY_MISSIONS.length,
      'Jobs', 'done'),
    figure('rank', rank.step, RANKS.length, 'Rank', rank.name),
    figure('respect', Math.floor(progress.respect), null, 'Respect', 'earned'),
    figure('sides', availableMissions(progress, ACTIVITIES).length, null, 'Side', 'jobs open'),
    figure('weapons', guns.filter((id) => arsenal.owned[id]).length, guns.length, 'Guns', 'owned'),
    figure('cars', cars.length, MAX_CARS, 'Cars', 'in garage'),
    figure('shops', PLACES.filter(isShop).length, null, 'Shops', 'in the city'),
    figure('radio', STATIONS.length, null, 'Radio', 'stations'),
  ];
}

/** The first story job not done, or null when the story is over. */
function nextJob(progress) {
  const { step, total, title } = storyPoint(progress);
  if (step > total) return null;
  const def = STORY_MISSIONS[step - 1];
  return { id: def.id, number: def.number, total, title, giver: castMember(def.giver)?.name ?? '' };
}

function nextRank(respect) {
  const next = nextUnlock(respect);
  return next && { name: next.name, needed: next.needed, opens: next.opens.map(unlockLabel) };
}

function districts() {
  return DISTRICT_LIST.map(({ id, name }) => {
    const faction = Object.values(FACTION_INFO).find((entry) => entry.turf === id);
    return { id, name, faction: faction?.name ?? '', colour: faction?.colour ?? '' };
  });
}

/**
 * One thing from each shop that Ilo has not got: one his rank still locks if there is one, else the dearest.
 * `needs` is the rank still needed; `short` says the cash does not stretch to it.
 */
function sale({ progress, wallet, arsenal, vitals, outfit, cars }) {
  const lockedBy = (id) => lockReason(id, progress.respect);
  const ctx = { wallet, arsenal, vitals, outfit, cars, driving: true, stars: 0, lockedBy };
  const picks = SALE_SHOPS.map((kind) => {
    const open = itemsFor(kind, ctx)
      .map((item) => ({ ...item, needs: lockedBy(item.id) ? rankNeeded(item.id) : '' }))
      .filter((item) => item.needs || !item.disabled || item.reason === 'Need cash');
    const pick = open.find((item) => item.needs) ?? open.sort((a, b) => b.price - a.price)[0];
    return pick && { id: pick.id, label: pick.label, price: pick.price, needs: pick.needs,
      short: !pick.needs && pick.price > wallet.cash };
  });
  return picks.filter(Boolean).slice(0, SALE_COUNT);
}

/** The page for `state` = { progress, wallet, arsenal, vitals, outfit, cars }. */
export function progressView(state) {
  return {
    figures: figures(state),
    job: nextJob(state.progress),
    rank: nextRank(state.progress.respect),
    districts: districts(),
    sale: sale(state),
  };
}

/** The stored save's line as the Continue card words it, or "Not saved yet"; `stored` is a parseSave result. */
export function lastSaveText(stored) {
  return stored?.status === 'ok' ? saveCardText(stored.save).saved : 'Not saved yet';
}
