// Shot-scene story seed: staged points in the story, their totals summed from the game's own rewards and prices.
import { giveWeapon } from './combat/arsenal.js';
import { STORY_MISSIONS } from './missions/story/index.js';
import { WEAPONS } from './combat/weapons.js';
import { ACTIVITIES } from './missions/activities/index.js';
import { WEAPON_PRICES, ARMOUR_PRICE, CAR_PRICES, GEAR } from './data/prices.js';
import { defaultSave, serialise } from './save/savegame.js';

/** When the staged saves were made: Friday 20 November 2026, 21:14 on the player's clock. */
export const STAGED_SAVED_AT = new Date(2026, 10, 20, 21, 14).getTime();

/** The colour a dealer delivers in (shops/catalog.js). */
const DELIVERY_PAINT = '#c0c5ce';

/** Seconds played when the staged saves were made: a little over six hours. */
const STAGED_CLOCK = 22340;

/** Jobs failed and retried on the way; a retry costs neither cash nor respect. */
const STAGED_FAILS = 3;

const LAST_JOB = {
  jobs: 7,
  sides: Object.freeze(['causeway-sprint']),
  weapons: Object.freeze(['pistol', 'smg']),
  armour: true,
};

/**
 * The points the staged scenes stand at. A point names what was done and what was bought, never a total:
 * `jobs` story jobs done in order, one entry in `sides` per side job won, and the shop buys still owned.
 */
export const STORY_POINTS = Object.freeze({
  /** Headline is next. */
  fourthJob: Object.freeze({ jobs: 3, weapons: Object.freeze(['pistol']) }),
  /** Tide Tables is next: the title's save. */
  sixDone: Object.freeze({ jobs: 6, weapons: Object.freeze(['pistol', 'smg']) }),
  /** Gilded Tide is next. */
  lastJob: Object.freeze(LAST_JOB),
  /** The last-job point with two cars bought for the garage. */
  garage: Object.freeze({ ...LAST_JOB, cars: Object.freeze(['sedan', 'pickup']) }),
});

const total = (list, value) => list.reduce((sum, entry) => sum + value(entry), 0);

/** The job gear a story job cannot be finished without buying ('gear:cutter' in a buy stage). */
const gearCost = (def) => total(def.stages.filter((stage) => stage.type === 'buy'),
  (stage) => GEAR[stage.item.split(':')[1]].price);

/** What play leaves a new game with at `point`: { done, paid, cash, respect }. */
export function storyTotals(point) {
  const jobs = STORY_MISSIONS.slice(0, point.jobs);
  const sides = (point.sides ?? []).map((id) => ACTIVITIES.find((def) => def.id === id));
  const earned = [...jobs, ...sides];
  const spent = total(jobs, gearCost)
    + total(point.weapons, (id) => WEAPON_PRICES[id])
    + total(point.cars ?? [], (type) => CAR_PRICES[type])
    + (point.armour ? ARMOUR_PRICE.price : 0);
  return {
    done: [...new Set(earned.map((def) => def.id))],
    paid: jobs.map((def) => def.id),
    cash: defaultSave().cash + total(earned, (def) => def.reward.cash) - spent,
    respect: total(earned, (def) => def.reward.respect),
  };
}

/** The cars bought by `point`, as the garage and the save keep them. */
const boughtCars = (point) => (point.cars ?? []).map((type) => ({ type, colour: DELIVERY_PAINT }));

/** Put a new game at `point`; call it before jumping to a job. The scene then sets ammo, health and position. */
export function seedStory(game, point) {
  const { done, paid, cash, respect } = storyTotals(point);
  const { progress } = game.missions;
  progress.done.push(...done);
  progress.paid.push(...paid);
  progress.respect = respect;
  const { wallet, arsenal, vitals } = game.player.state;
  wallet.cash = cash;
  for (const id of point.weapons) giveWeapon(arsenal, id);
  if (point.armour) vitals.armour = ARMOUR_PRICE.amount;
  if (point.cars) game.ownedCars = boughtCars(point);
}

/** The text a game at `point` saves, stamped STAGED_SAVED_AT. */
export function storySaveText(point) {
  const { done, paid, cash, respect } = storyTotals(point);
  return serialise({
    ...defaultSave(),
    cash,
    armour: point.armour ? ARMOUR_PRICE.amount : 0,
    weapons: Object.fromEntries(point.weapons.map((id) => [id,
      { clip: WEAPONS[id].clip, reserve: WEAPONS[id].startReserve }])),
    cars: boughtCars(point),
    clock: STAGED_CLOCK,
    savedAt: STAGED_SAVED_AT,
    missions: { done, paid, respect, fails: STAGED_FAILS },
  });
}
