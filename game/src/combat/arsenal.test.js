// Tests for the arsenal and vitals: firing spends the clip, reloads draw from reserve, armour soaks hits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createArsenal, giveWeapon, select, cycle, tryFire, updateArsenal, startReload, addAmmo, ammoView,
} from './arsenal.js';
import { WEAPONS } from './weapons.js';
import { createVitals, applyDamage, heal, addArmour, isDown } from './vitals.js';

function fireAll(arsenal) {
  let shots = 0;
  for (let i = 0; i < 1000; i += 1) {
    const result = tryFire(arsenal);
    if (result === 'fired') shots += 1;
    if (arsenal.reloading > 0) break;
    updateArsenal(arsenal, 1 / 60);
  }
  return shots;
}

test('a new arsenal holds fists, which punch without ammo', () => {
  const arsenal = createArsenal();
  assert.equal(arsenal.current, 'fists');
  assert.equal(tryFire(arsenal), 'melee');
  assert.equal(tryFire(arsenal), null);
});

test('firing empties the clip, then a reload refills it from reserve', () => {
  const arsenal = createArsenal();
  giveWeapon(arsenal, 'pistol');
  assert.ok(select(arsenal, 'pistol'));
  updateArsenal(arsenal, 1);
  assert.equal(fireAll(arsenal), WEAPONS.pistol.clip);
  assert.ok(arsenal.reloading > 0);
  assert.equal(tryFire(arsenal), null);
  let completed = false;
  for (let t = 0; t < 3 && !completed; t += 1 / 60) completed = updateArsenal(arsenal, 1 / 60);
  assert.ok(completed);
  const view = ammoView(arsenal);
  assert.equal(view.clip, WEAPONS.pistol.clip);
  assert.equal(view.reserve, WEAPONS.pistol.startReserve - WEAPONS.pistol.clip);
});

test('an empty gun with no reserve clicks dry and cannot reload', () => {
  const arsenal = createArsenal();
  giveWeapon(arsenal, 'shotgun');
  select(arsenal, 'shotgun');
  arsenal.owned.shotgun.reserve = 0;
  arsenal.owned.shotgun.clip = 0;
  updateArsenal(arsenal, 1);
  assert.equal(tryFire(arsenal), 'empty');
  assert.equal(arsenal.reloading, 0);
  assert.equal(startReload(arsenal), false);
  addAmmo(arsenal, 'shotgun', 8);
  assert.ok(startReload(arsenal));
});

test('the fire rate limits shots and cycling skips weapons not owned', () => {
  const arsenal = createArsenal();
  giveWeapon(arsenal, 'smg');
  giveWeapon(arsenal, 'shotgun');
  cycle(arsenal);
  assert.equal(arsenal.current, 'smg');
  cycle(arsenal);
  assert.equal(arsenal.current, 'shotgun');
  cycle(arsenal);
  assert.equal(arsenal.current, 'fists');
  cycle(arsenal, -1);
  assert.equal(arsenal.current, 'shotgun');
  select(arsenal, 'smg');
  updateArsenal(arsenal, 1);
  let shots = 0;
  for (let t = 0; t < 1; t += 1 / 60) {
    if (tryFire(arsenal) === 'fired') shots += 1;
    updateArsenal(arsenal, 1 / 60);
  }
  assert.ok(shots >= 10 && shots <= 12, `smg fired ${shots} in a second`);
});

test('buying a weapon twice tops up its reserve', () => {
  const arsenal = createArsenal();
  giveWeapon(arsenal, 'pistol');
  giveWeapon(arsenal, 'pistol');
  assert.equal(arsenal.owned.pistol.reserve, WEAPONS.pistol.startReserve * 2);
  assert.equal(giveWeapon(arsenal, 'rocket'), false);
});

test('armour soaks most damage until it runs out; healing caps at 100', () => {
  const vitals = createVitals(100, 20);
  applyDamage(vitals, 20);
  assert.equal(vitals.armour, 6);
  assert.equal(vitals.health, 94);
  applyDamage(vitals, 50);
  assert.equal(vitals.armour, 0);
  assert.equal(vitals.health, 50);
  heal(vitals, 500);
  assert.equal(vitals.health, 100);
  addArmour(vitals, 500);
  assert.equal(vitals.armour, 100);
  applyDamage(vitals, 1000);
  assert.ok(isDown(vitals));
});
