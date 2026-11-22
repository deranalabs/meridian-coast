// The car's three cameras: V cycles back to chase, and the two on the car stay inside its box and look ahead.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAR_VIEWS, nextCarView, viewPose, turnHead } from './carview.js';
import { CAR_TYPES } from './carmodels.js';

test('chase is the default and V cycles through the seat and the bonnet back to it', () => {
  assert.deepEqual([...CAR_VIEWS], ['chase', 'driver', 'bonnet']);
  let view = CAR_VIEWS[0];
  const seen = [];
  for (let press = 0; press < 3; press += 1) {
    view = nextCarView(view);
    seen.push(view);
  }
  assert.deepEqual(seen, ['driver', 'bonnet', 'chase']);
});

test('both views on the car stay inside its box at any speed, sway and look', () => {
  for (const [type, spec] of Object.entries(CAR_TYPES)) {
    for (const view of ['driver', 'bonnet']) {
      for (const speed of [-9, 0, 12, spec.maxSpeed, 90]) {
        for (let time = 0; time < 3; time += 0.07) {
          const pose = viewPose(spec, view, speed, time);
          const where = `${type} ${view} at ${speed}: ${JSON.stringify(pose)}`;
          assert.ok(Math.abs(pose.x) < spec.width / 2, where);
          assert.ok(pose.y > spec.belt && pose.y < spec.roof, where);
          assert.ok(Math.abs(pose.z) < spec.length / 2, where);
        }
      }
    }
  }
});

test('the seat is the driver\'s, behind the glass; the bonnet view is ahead of it', () => {
  for (const spec of Object.values(CAR_TYPES)) {
    const seat = viewPose(spec, 'driver', 0, 0);
    assert.ok(seat.x > 0.2, 'left-hand drive: +x is the car\'s left');
    assert.ok(seat.z < spec.roofFront);
    assert.ok(viewPose(spec, 'bonnet', 0, 0).z > spec.glassFront);
  }
});

test('the lens widens with speed', () => {
  const spec = CAR_TYPES.coupe;
  for (const view of ['driver', 'bonnet']) {
    assert.ok(viewPose(spec, view, 30, 0).fov > viewPose(spec, view, 0, 0).fov + 6);
  }
});

test('mouse look is a small turn of the head', () => {
  const head = { yaw: 0, pitch: 0 };
  turnHead(head, { dx: 9000, dy: 9000 }, 1 / 60);
  assert.ok(head.yaw < 0 && head.yaw >= -0.8 && head.pitch < 0 && head.pitch >= -0.4);
  turnHead(head, { dx: -90000, dy: -90000 }, 1 / 60);
  assert.ok(head.yaw > 0 && head.yaw <= 0.8 && head.pitch > 0 && head.pitch <= 0.4);
  for (let step = 0; step < 60 * 5; step += 1) turnHead(head, { dx: 0, dy: 0 }, 1 / 60);
  assert.ok(Math.abs(head.yaw) < 0.02, 'it drifts back to the road');
});
