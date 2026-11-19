// Tests for shop transactions: prices are charged once, owned or unaffordable items refuse, effects are reported.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemsFor, buy } from './catalog.js';
import { createWallet, penaltyFor, takePenalty, receive } from '../economy/wallet.js';
import { createArsenal } from '../combat/arsenal.js';
import { createVitals } from '../combat/vitals.js';
import { WEAPON_PRICES, AMMO_PRICES, RESPRAY_PRICE, CAR_PRICES, PENALTIES } from '../data/prices.js';

function context(cash) {
  return { wallet: createWallet(cash), arsenal: createArsenal(), vitals: createVitals(100, 0),
    outfit: { hair: 0, top: 0, bottom: 0, outer: 0, colours: {} }, cars: [], driving: false, stars: 0 };
}

test('buying a pistol charges its price once and then lists it as owned with ammo for sale', () => {
  const ctx = context(1000);
  const result = buy('gun', 'weapon:pistol', ctx);
  assert.ok(result.ok);
  assert.equal(ctx.wallet.cash, 1000 - WEAPON_PRICES.pistol);
  assert.ok(ctx.arsenal.owned.pistol);
  const again = buy('gun', 'weapon:pistol', ctx);
  assert.equal(again.ok, false);
  assert.equal(ctx.wallet.cash, 1000 - WEAPON_PRICES.pistol);
  assert.ok(itemsFor('gun', ctx).some((item) => item.id === 'ammo:pistol'));
  const reserve = ctx.arsenal.owned.pistol.reserve;
  assert.ok(buy('gun', 'ammo:pistol', ctx).ok);
  assert.equal(ctx.arsenal.owned.pistol.reserve, reserve + AMMO_PRICES.pistol.rounds);
});

test('items you cannot afford refuse and take nothing', () => {
  const ctx = context(100);
  const result = buy('gun', 'weapon:smg', ctx);
  assert.equal(result.ok, false);
  assert.equal(ctx.wallet.cash, 100);
  assert.equal(ctx.arsenal.owned.smg, undefined);
  assert.equal(buy('gun', 'weapon:rocket', ctx).ok, false);
});

test('clothes change the outfit and report it; wearing an item marks it', () => {
  const ctx = context(500);
  const result = buy('clothes', 'wear:pink-blazer', ctx);
  assert.ok(result.ok);
  assert.ok(result.effect.outfit);
  assert.equal(ctx.outfit.colours.outer, '#ff5fa2');
  const listed = itemsFor('clothes', ctx).find((item) => item.id === 'wear:pink-blazer');
  assert.equal(listed.reason, 'Wearing');
});

test('food heals, and is refused at full health', () => {
  const ctx = context(100);
  assert.equal(buy('food', 'food:taco', ctx).ok, false);
  ctx.vitals.health = 40;
  assert.ok(buy('food', 'food:bowl', ctx).ok);
  assert.equal(ctx.vitals.health, 90);
});

test('the spray bay needs a car and reports a respray; the dealer delivers a car', () => {
  const ctx = context(20000);
  assert.equal(buy('spray', 'respray', ctx).ok, false);
  ctx.driving = true;
  const spray = buy('spray', 'respray', ctx);
  assert.ok(spray.effect.respray);
  assert.equal(ctx.wallet.cash, 20000 - RESPRAY_PRICE);
  const car = buy('dealer', 'car:coupe', ctx);
  assert.equal(car.effect.spawnCar, 'coupe');
  assert.equal(ctx.cars.length, 1);
  assert.equal(ctx.wallet.cash, 20000 - RESPRAY_PRICE - CAR_PRICES.coupe);
  assert.equal(buy('garage', 'fetch:0', ctx).effect.fetchCar, 0);
});

test('penalties take a share within limits and never more than the wallet', () => {
  const rich = createWallet(100000);
  assert.equal(penaltyFor(rich, PENALTIES.busted), PENALTIES.busted.max);
  const poor = createWallet(40);
  assert.equal(takePenalty(poor, PENALTIES.wasted), 40);
  assert.equal(poor.cash, 0);
  receive(poor, 25.4);
  assert.equal(poor.cash, 25);
});
