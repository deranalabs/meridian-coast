// Every price, wage and penalty in Port Meridian, in dollars: shops, services, fines and pay.

/** Gun shop: weapons (the first clip comes loaded) and ammo boxes. */
export const WEAPON_PRICES = Object.freeze({
  pistol: 450,
  smg: 1800,
  shotgun: 1350,
});

export const AMMO_PRICES = Object.freeze({
  pistol: { rounds: 36, price: 60 },
  smg: { rounds: 90, price: 140 },
  shotgun: { rounds: 16, price: 110 },
});

export const ARMOUR_PRICE = Object.freeze({ amount: 100, price: 400 });

/** Clothing shop: one price per wardrobe slot change. */
export const CLOTHING_PRICES = Object.freeze({
  top: 85,
  bottom: 70,
  outer: 240,
  hat: 45,
});

/** Food stand: each item restores health. */
export const FOOD = Object.freeze([
  { id: 'taco', name: 'Fish Taco', price: 8, health: 25 },
  { id: 'bowl', name: 'Poke Bowl', price: 15, health: 50 },
  { id: 'feast', name: 'Coast Platter', price: 32, health: 100 },
]);

/** Car dealer: cars for sale by fleet type, and the garage fee to fetch a stored car. */
export const CAR_PRICES = Object.freeze({
  sedan: 6500,
  coupe: 14500,
  pickup: 9800,
});

export const GARAGE_FETCH = 0;

/**
 * Job gear: never on the shelf until a mission stage asks for it (catalog.js lists `gear:<id>` only then).
 * `shop` is the shop kind that sells it.
 */
export const GEAR = Object.freeze({
  cutter: { shop: 'gun', name: 'Thermal Lance', detail: 'Cuts a vault hinge in half a minute', price: 900 },
  masks: { shop: 'clothes', name: 'Gull Masks, four', detail: 'Rubber seabird faces for the crew', price: 160 },
});

/** Spray bay: a respray that also clears the wanted level. */
export const RESPRAY_PRICE = 250;

/** Penalties: a share of cash with a floor and a cap, taken when busted or wasted. */
export const PENALTIES = Object.freeze({
  busted: { share: 0.1, min: 100, max: 2500 },
  wasted: { share: 0.08, min: 100, max: 1500 },
});

/** Pay: cash dropped by downed people and found in the street, and a wage paid while driving a cab later. */
export const PICKUPS = Object.freeze({
  pedestrianDrop: [5, 60],
  officerDrop: [20, 90],
  streetCash: [40, 180],
});

export const WAGES = Object.freeze({
  safeHouseRest: 0,
  dailyStipend: 50,
});
