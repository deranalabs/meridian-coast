// The jump: its height and length, landings on road and pavement, never inside a car, and never from one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { JUMP, createJump, startJump, stepJump, clearOfCars } from './jump.js';
import { createPlayer } from './player.js';
import { CAR_TYPES } from '../vehicles/carmodels.js';

const DT = 1 / 60;
const KERB = 0.15;
/** Road for z below 1, a pavement a kerb higher from there on. */
const ground = { surfaceAt: (x, z) => (z < 1 ? { height: 0, kind: 'road' } : { height: KERB, kind: 'sidewalk' }) };
const colliders = { resolveCircle: (x, z) => ({ x, z, hit: false }) };

function makePlayer(cars = []) {
  const position = { x: 0, y: 0, z: 0, set(x, y, z) {
    Object.assign(this, { x, y, z });
  } };
  const body = { position, heading: 0, speed: 0, visible: true, clips: [], play(name) {
    this.clips.push(name);
  }, replay(name) {
    this.clips.push(name);
  } };
  return { body, player: createPlayer(body, { fleet: { cars }, colliders, ground }) };
}
const keys = (held = [], pressed = []) => ({ down: (...codes) => codes.some((code) => held.includes(code)),
  pressed: (code) => pressed.includes(code),
  axis: (negative, positive) => Number(positive.some((code) => held.includes(code))) });

/** Press Space once, then hold `held` until Ilo lands; the highest point and how long it took. */
function jump(player, body, held = []) {
  player.update(DT, keys(held, ['Space']), 0);
  let top = body.position.y;
  let steps = 1;
  while (player.state.jump.active && steps < 600) {
    player.update(DT, keys(held, steps % 3 ? [] : ['Space']), 0);
    top = Math.max(top, body.position.y);
    steps += 1;
  }
  return { top, seconds: steps * DT };
}

test('the arc is the same every time: about 0.9 m high and two thirds of a second', () => {
  const state = createJump();
  startJump(state, 0);
  let y = 0;
  let top = 0;
  let steps = 0;
  while (state.active && steps < 600) {
    y = stepJump(state, DT, 0);
    top = Math.max(top, y);
    steps += 1;
  }
  assert.ok(Math.abs(top - JUMP.height) < 0.02 && Math.abs(JUMP.height - 0.9) < 0.05, `top ${top}`);
  assert.ok(Math.abs(steps * DT - JUMP.seconds) < 0.03 && Math.abs(JUMP.seconds - 0.67) < 0.03);
  assert.equal(y, 0);
});

test('Ilo rises, cannot jump again in the air, and lands exactly on the road', () => {
  const { player, body } = makePlayer();
  const { top, seconds } = jump(player, body);
  assert.ok(Math.abs(top - JUMP.height) < 0.02);
  assert.ok(Math.abs(seconds - JUMP.seconds) < 0.05, 'pressing Space in the air changed nothing');
  assert.equal(body.position.y, 0);
  assert.ok(body.clips.includes('jump'));
});

test('a running jump from the road lands on the pavement, and one off it lands back on the road', () => {
  const up = makePlayer();
  up.body.position.set(0, 0, -0.5);
  jump(up.player, up.body, ['KeyW', 'ShiftLeft']);
  assert.ok(up.body.position.z > 1);
  assert.equal(up.body.position.y, KERB);
  const down = makePlayer();
  down.body.position.set(0, KERB, 1.2);
  down.player.update(DT, keys([], ['Space']), Math.PI);
  for (let step = 0; step < 120; step += 1) down.player.update(DT, keys(['KeyW'], []), Math.PI);
  assert.ok(down.body.position.z < 1);
  assert.equal(down.body.position.y, 0);
});

test('a landing is never inside a car', () => {
  for (const spec of Object.values(CAR_TYPES)) {
    for (const heading of [0, 0.7, Math.PI / 2]) {
      const car = { spec, heading, visible: true, position: { x: 0, y: 0, z: -2 } };
      const { player, body } = makePlayer([car]);
      body.position.set(0, 0, -5.6);
      jump(player, body, ['KeyW', 'ShiftLeft']);
      const dx = body.position.x - car.position.x;
      const dz = body.position.z - car.position.z;
      const across = dx * Math.cos(heading) - dz * Math.sin(heading);
      const along = dx * Math.sin(heading) + dz * Math.cos(heading);
      const clear = Math.abs(across) >= spec.width / 2 || Math.abs(along) >= spec.length / 2;
      assert.ok(clear, `${spec.name} at ${heading}: landed at ${across}, ${along}`);
    }
  }
  const car = { spec: CAR_TYPES.coupe, heading: 0, visible: true, position: { x: 0, y: 0, z: 0 } };
  const above = clearOfCars([car], 0.2, 0, 1.6, 0.35);
  assert.deepEqual([above.x, above.z], [0.2, 0], 'over the roof is not inside');
});

test('a cutscene in mid-air still lets Ilo land', () => {
  const { player, body } = makePlayer();
  player.update(DT, keys([], ['Space']), 0);
  for (let step = 0; step < 10; step += 1) player.update(DT, keys(), 0);
  player.holdForScene();
  for (let step = 0; step < 90; step += 1) player.update(DT, keys(), 0);
  assert.equal(body.position.y, 0);
});

test('Space in a car is the handbrake, not a jump', () => {
  const car = { spec: CAR_TYPES.coupe, heading: 0, pitch: 0, roll: 0, visible: true,
    position: { x: 0, y: 0, z: 0, set(x, y, z) {
      Object.assign(this, { x, y, z });
    } } };
  const { player } = makePlayer([car]);
  player.enterNow(car);
  player.update(DT, keys(['Space'], ['Space']), 0);
  assert.equal(player.state.jump.active, false);
  assert.equal(player.state.handbrake, true);
});
