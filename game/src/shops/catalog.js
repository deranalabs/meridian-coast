// Shop catalogue and transactions: what each shop lists for the player right now, and what buying an item does.
import { WEAPON_PRICES, AMMO_PRICES, ARMOUR_PRICE, CLOTHING_PRICES, FOOD, CAR_PRICES, RESPRAY_PRICE }
  from '../data/prices.js';
import { CLOTHING } from '../data/clothing.js';
import { WEAPONS } from '../combat/weapons.js';
import { giveWeapon, addAmmo } from '../combat/arsenal.js';
import { heal, addArmour, MAX_HEALTH, MAX_ARMOUR } from '../combat/vitals.js';
import { pay } from '../economy/wallet.js';
import { withItem, wears } from './outfit.js';
import { CAR_TYPES } from '../vehicles/carmodels.js';

export const SHOP_TITLES = {
  gun: 'Weapons, ammo and body armour',
  clothes: 'Coastal wear, made to be seen',
  dealer: 'New cars, delivered to the kerb',
  spray: 'A fresh coat and no questions',
  food: 'Hot food, fast',
  safehouse: 'Home, for now',
  garage: 'Your cars, kept safe',
};

const MAX_CARS = 6;

/** Items for shop `kind` given ctx = {wallet, arsenal, vitals, outfit, cars, driving, stars}. */
export function itemsFor(kind, ctx) {
  const cash = ctx.wallet.cash;
  const item = (id, label, detail, price, blocked = '') => ({
    id, label, detail, price, disabled: Boolean(blocked) || price > cash, reason: blocked || (price > cash ? 'Need cash'
      : ''),
  });
  if (kind === 'gun') {
    const list = [];
    for (const [id, price] of Object.entries(WEAPON_PRICES)) {
      const owned = Boolean(ctx.arsenal.owned[id]);
      list.push(item(`weapon:${id}`, WEAPONS[id].name, owned ? 'Owned' : `${WEAPONS[id].clip}-round clip`, price,
        owned ? 'Owned' : ''));
    }
    for (const [id, box] of Object.entries(AMMO_PRICES)) {
      if (!ctx.arsenal.owned[id]) continue;
      list.push(item(`ammo:${id}`, `${WEAPONS[id].name} ammo`, `+${box.rounds} rounds`, box.price));
    }
    list.push(item('armour', 'Body armour', 'Soaks 70 % of each hit', ARMOUR_PRICE.price,
      ctx.vitals.armour >= MAX_ARMOUR ? 'Full' : ''));
    return list;
  }
  if (kind === 'clothes') {
    return CLOTHING.map((c) => item(`wear:${c.id}`, c.name, c.slot === 'hat' ? 'Hat' : c.slot[0].toUpperCase()
      + c.slot.slice(1), CLOTHING_PRICES[c.slot], wears(ctx.outfit, c) ? 'Wearing' : ''));
  }
  if (kind === 'food') {
    return FOOD.map((f) => item(`food:${f.id}`, f.name, `+${f.health} health`, f.price,
      ctx.vitals.health >= MAX_HEALTH ? 'Not hungry' : ''));
  }
  if (kind === 'dealer') {
    return Object.entries(CAR_PRICES).map(([type, price]) => item(`car:${type}`, CAR_TYPES[type].name,
      `Top speed ${Math.round(CAR_TYPES[type].maxSpeed * 3.6)} km/h`, price, ctx.cars.length >= MAX_CARS
        ? 'Lock-up full' : ''));
  }
  if (kind === 'spray') {
    return [item('respray', 'Respray and lose the heat', ctx.stars > 0 ? 'Clears your wanted level' : 'New colour',
      RESPRAY_PRICE, ctx.driving ? '' : 'Drive in first')];
  }
  if (kind === 'safehouse') return [item('sleep', 'Sleep and save', 'Restores health, saves the game', 0)];
  if (kind === 'garage') {
    const list = ctx.cars.map((car, index) => item(`fetch:${index}`, CAR_TYPES[car.type].name, 'Bring it out', 0));
    return list.length ? list : [item('none', 'The lock-up is empty', 'Buy cars at Marlin Motors', 0, 'Empty')];
  }
  return [];
}

/**
 * Buy item `id` from shop `kind`. Mutates ctx and returns {ok, message, effect}; effect tells the game what to do
 * next: {outfit}, {respray}, {spawnCar: type}, {fetchCar: index} or {save}.
 */
export function buy(kind, id, ctx) {
  const listed = itemsFor(kind, ctx).find((entry) => entry.id === id);
  if (!listed) return { ok: false, message: 'Not sold here' };
  if (listed.disabled) return { ok: false, message: listed.reason };
  const paid = pay(ctx.wallet, listed.price);
  if (!paid.ok) return { ok: false, message: paid.reason };
  const [type, key] = id.split(':');
  if (type === 'weapon') giveWeapon(ctx.arsenal, key);
  else if (type === 'ammo') addAmmo(ctx.arsenal, key, AMMO_PRICES[key].rounds);
  else if (type === 'armour') addArmour(ctx.vitals, ARMOUR_PRICE.amount);
  else if (type === 'food') heal(ctx.vitals, FOOD.find((f) => f.id === key).health);
  else if (type === 'wear') {
    ctx.outfit = withItem(ctx.outfit, CLOTHING.find((c) => c.id === key));
    return { ok: true, message: `Wearing ${listed.label}`, effect: { outfit: ctx.outfit } };
  } else if (type === 'car') {
    ctx.cars.push({ type: key, colour: '#c0c5ce' });
    return { ok: true, message: `${listed.label} delivered`, effect: { spawnCar: key } };
  } else if (type === 'respray') {
    return { ok: true, message: 'Fresh paint. The heat is off', effect: { respray: true } };
  }
  else if (type === 'sleep') {
    heal(ctx.vitals, MAX_HEALTH);
    return { ok: true, message: 'Game saved', effect: { save: true } };
  } else if (type === 'fetch') return { ok: true, message: 'Brought out', effect: { fetchCar: Number(key) } };
  return { ok: true, message: `Bought ${listed.label}`, effect: {} };
}
