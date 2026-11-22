// Tests for hidden packages on the real city: twenty on dry open pavement and apart, collected once, and saved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLayout } from '../world/layout.js';
import { createFacadeBuilder } from '../world/buildingkit.js';
import { buildBuildings } from '../world/buildings.js';
import { addCasino } from '../world/casino.js';
import { createLandmarks } from '../world/landmarks.js';
import { createGround } from '../world/ground.js';
import { createColliders } from '../world/colliders.js';
import { edgeBand } from '../world/boundary.js';
import { DISTRICT_BY_ID } from '../world/districts.js';
import { heightAt, WATER_LEVEL } from '../world/heightfield.js';
import { packageSpots } from '../world/packagespots.js';
import { getTimeOfDay } from '../render/timeofday.js';
import { PACKAGE_COUNT, PACKAGE_PAY, createFound, collectAt, cleanFound, restoreFound } from './packages.js';
import { createWallet } from './wallet.js';
import { defaultSave, parseSave, serialise } from '../save/savegame.js';
import { storyTotals, STORY_POINTS } from '../shotsstory.js';

function buildWorld(seed) {
  const layout = buildLayout(seed);
  const builder = createFacadeBuilder();
  const buildings = buildBuildings(builder, layout, seed);
  const casinoBlock = layout.blocks.find((block) => block.reserved === 'casino');
  const casino = casinoBlock ? addCasino(builder, casinoBlock, DISTRICT_BY_ID.neon.sidewalk) : null;
  const landmarks = createLandmarks({ layout, buildings, casino, surfaces: { data: null } }, getTimeOfDay('dusk'));
  const colliders = createColliders();
  for (const box of buildings.colliders) colliders.addBox(box);
  for (const shape of landmarks.colliders) {
    if (shape.r) colliders.addCircle(shape);
    else colliders.addBox(shape);
  }
  const ground = createGround(layout, buildings.colliders);
  return { layout, ground, colliders, footprints: buildings.colliders };
}

for (const seed of [1, 2, 9]) {
  const world = buildWorld(seed);
  const spots = packageSpots(world, seed);

  test(`seed ${seed}: twenty packages, all on ground and outside every footprint`, () => {
    assert.equal(spots.length, PACKAGE_COUNT);
    assert.equal(PACKAGE_COUNT, 20);
    for (const { x, z, y } of spots) {
      const at = `(${x.toFixed(1)}, ${z.toFixed(1)})`;
      const surface = world.ground.surfaceAt(x, z);
      assert.equal(surface.kind, 'sidewalk', at);
      assert.equal(y, surface.height, at);
      assert.ok(heightAt(x, z) > WATER_LEVEL, `${at} is dry`);
      for (const b of world.footprints) assert.ok(!(x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1), at);
      assert.equal(world.colliders.resolveCircle(x, z, 1.2).hit, false, `${at} has room to stand`);
      assert.equal(edgeBand(x, z), null, `${at} is short of the soft wall`);
    }
  });

  test(`seed ${seed}: no two within 30 m, spread over every district, and the same every time`, () => {
    spots.forEach((one, i) => spots.slice(i + 1).forEach((other) => {
      assert.ok(Math.hypot(one.x - other.x, one.z - other.z) >= 30, `${i} is crowded`);
    }));
    const districts = new Set(spots.map(({ x, z }) => world.ground.blockAt(x, z).district));
    assert.ok(districts.size >= 4, `only ${[...districts]}`);
    assert.deepEqual(packageSpots(world, seed), spots);
  });
}

test('walking through one pays once; a car reaches a little further', () => {
  const spots = [{ x: 0, z: 0 }, { x: 80, z: 0 }];
  const found = createFound();
  const wallet = createWallet(100);
  assert.equal(collectAt(spots, found, { x: 5, z: 0, driving: false }, wallet), -1);
  assert.equal(collectAt(spots, found, { x: 0.5, z: 0, driving: false }, wallet), 0);
  assert.equal(wallet.cash, 100 + PACKAGE_PAY);
  assert.equal(collectAt(spots, found, { x: 0.5, z: 0, driving: false }, wallet), -1, 'it is gone');
  assert.equal(collectAt(spots, found, { x: 82.4, z: 0, driving: false }, wallet), -1);
  assert.equal(collectAt(spots, found, { x: 82.4, z: 0, driving: true }, wallet), 1);
  assert.equal(found.size, 2);
});

test('the count survives a save and a load', () => {
  const found = createFound();
  for (const index of [0, 4, 19, 7, 11, 2, 13]) found.add(index);
  const text = serialise({ ...defaultSave(), packages: cleanFound([...found]) });
  const { save, status } = parseSave(text);
  assert.equal(status, 'ok');
  const loaded = createFound();
  loaded.add(5);
  restoreFound(loaded, save.packages);
  assert.equal(loaded.size, 7);
  assert.deepEqual([...loaded].sort((a, b) => a - b), [0, 2, 4, 7, 11, 13, 19]);
});

test('an old or broken save loads with no bad packages', () => {
  assert.deepEqual(parseSave(JSON.stringify({ version: 2, cash: 5 })).save.packages, []);
  assert.deepEqual(parseSave(JSON.stringify({ version: 2, packages: 'all' })).save.packages, []);
  assert.deepEqual(cleanFound([3, 3, -1, 20, 2.5, '4', 0]), [0, 3]);
});

test('the staged Progress save counts seven and was paid for them', () => {
  const { packages, cash } = storyTotals(STORY_POINTS.garage);
  assert.equal(packages.length, 7);
  assert.equal(cash - storyTotals({ ...STORY_POINTS.garage, packages: 0 }).cash, 7 * PACKAGE_PAY);
  assert.deepEqual(storyTotals(STORY_POINTS.lastJob).packages, [], 'the cover and the map stand where they stood');
});
