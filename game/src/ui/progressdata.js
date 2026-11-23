// Progress page data: every figure and line of the page, worked out from the game's data and the player's state.
import { STORY_MISSIONS } from '../missions/story/index.js';
import { ACTIVITIES } from '../missions/activities/index.js';
import { RANKS } from '../missions/progress.js';
import { rankProgress, nextUnlock, lockReason, rankNeeded, unlockLabel } from '../missions/respect.js';
import { PLACES, USABLE } from '../data/places.js';
import { WEAPON_PRICES } from '../data/prices.js';
import { castMember } from '../data/cast.js';
import { itemsFor, MAX_CARS } from '../shops/catalog.js';
import { DISTRICT_LIST } from '../world/districts.js';
import { saveCardText, storyPoint } from './savecard.js';
import { completion, kilometres } from '../stats/career.js';

/** Ilo's own doors: they open a menu but are not shops. */
const HOMES = new Set(['safehouse', 'garage']);
const isShop = (place) => USABLE.has(place.kind) && !HOMES.has(place.kind);

/** The shops the sale list reads, in order: one thing from each until it has three. */
const SALE_SHOPS = ['gun', 'dealer', 'clothes', 'spray', 'food'];
const SALE_COUNT = 3;

/** One bar a part of the city to finish, have out of `of`; the completion percentage is their mean. */
function bars({ progress, arsenal, cars, career, packages }) {
  const guns = Object.keys(WEAPON_PRICES);
  const shops = PLACES.filter(isShop).map((place) => place.id);
  const doneOf = (list) => list.filter((def) => progress.done.includes(def.id)).length;
  const bar = (id, label, have, of) => ({ id, label, have, of });
  return [
    bar('jobs', 'Story jobs', doneOf(STORY_MISSIONS), STORY_MISSIONS.length),
    bar('sides', 'Side jobs', doneOf(ACTIVITIES), ACTIVITIES.length),
    bar('guns', 'Guns', guns.filter((id) => arsenal.owned[id]).length, guns.length),
    bar('cars', 'Cars', cars.length, MAX_CARS),
    bar('shops', 'Shops used', shops.filter((id) => career.shops.includes(id)).length, shops.length),
    bar('packages', 'Packages', packages.count, packages.total),
    bar('districts', 'Districts', DISTRICT_LIST.filter(({ id }) => career.districts.includes(id)).length,
      DISTRICT_LIST.length),
  ];
}

/** The career counters, big figures with a short name under each. */
function careerFigures(career) {
  return [
    { id: 'stolen', value: String(career.stolen), label: 'Cars stolen' },
    { id: 'starsLost', value: String(career.starsLost), label: 'Stars lost' },
    { id: 'busted', value: String(career.busted), label: 'Busted' },
    { id: 'wasted', value: String(career.wasted), label: 'Wasted' },
    { id: 'km', value: kilometres(career), label: 'Km driven' },
  ];
}

/** Where Ilo stands now: rank n of m, its name and the respect earned. */
function rankNow(respect) {
  const rank = rankProgress(respect);
  return { step: rank.step, of: RANKS.length, name: rank.name, respect: Math.floor(respect) };
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

/**
 * The page for `state` = { progress, wallet, arsenal, vitals, outfit, cars, career, packages: { count, total } }:
 * the completion percentage, its bars, the career counters, the rank, the next job and rank, and the sale list.
 */
export function progressView(state) {
  const parts = bars(state);
  return {
    complete: completion(parts),
    bars: parts,
    career: careerFigures(state.career),
    now: rankNow(state.progress.respect),
    job: nextJob(state.progress),
    rank: nextRank(state.progress.respect),
    sale: sale(state),
  };
}

/** The stored save's line as the Continue card words it, or "Not saved yet"; `stored` is a parseSave result. */
export function lastSaveText(stored) {
  return stored?.status === 'ok' ? saveCardText(stored.save).saved : 'Not saved yet';
}
