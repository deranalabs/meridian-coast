// Unit tests for the dispatch report: sorting, call signs, roadblock and helicopter rows, officer count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { policeReport, callSign, stateKey, MODE_STATE, ROLE_BRIEF } from './report.js';

const unit = (index, x, z, role, mode, officersOut = false) => ({
  car: { index }, vehicle: { x, z, speed: 10 }, driver: { role }, mode, officersOut,
});

function fakePolice({ heli = false } = {}) {
  return {
    units: {
      units: [unit(4, 80, 0, 'ram', 'pursue'), unit(1, 0, 30, 'left', 'search'), unit(7, 0, -200, 'block', 'leave')],
    },
    helicopter: { state: { active: heli, x: 0, z: 50, spot: heli ? { x: 0, z: 2 } : null } },
    roadblocks: {
      blocks: [{
        x: 10, z: 0, cars: [{}, {}], officers: [{ active: true, down: false }, { active: true, down: true }],
      }],
    },
    officers: { pool: [{ active: true, down: false }, { active: true, down: true }, { active: false, down: false },
      { active: true, down: false }] },
  };
}

test('rows are sorted nearest first and nearest is the first distance', () => {
  const report = policeReport(fakePolice(), 0, 0);
  const metres = report.rows.map((row) => row.metres);
  assert.deepEqual(metres, [...metres].sort((a, b) => a - b));
  assert.equal(report.nearest, 10);
  assert.equal(report.cars, 3);
});

test('cruisers get stable radio call signs, roles and states', () => {
  const report = policeReport(fakePolice(), 0, 0);
  const cars = report.rows.filter((row) => row.kind === 'car');
  assert.equal(cars.length, 3);
  const first = cars.find((row) => row.metres === 30);
  assert.equal(first.call, callSign(1));
  assert.match(first.call, /^\d-[A-Z][a-z]+-\d+$/);
  assert.equal(first.detail, 'Flank left');
  assert.equal(first.state, 'Search');
  assert.equal(cars.find((row) => row.metres === 200).state, 'Return');
  assert.notEqual(callSign(1), callSign(2));
});

test('a roadblock row counts its cars and standing officers', () => {
  const block = policeReport(fakePolice(), 0, 0).rows.find((row) => row.kind === 'block');
  assert.equal(block.call, 'Roadblock');
  assert.equal(block.detail, '2 cars, 1 out');
  assert.equal(block.brief, '2 cars');
});

test('every brief job word fits a HUD row whole: seven letters at most, never cut with an ellipsis', () => {
  const rows = [...policeReport(fakePolice(), 0, 0).rows, ...policeReport(fakePolice({ heli: true }), 0, 0).rows];
  for (const row of rows) assert.ok(row.brief && row.brief.length <= 7 && !row.brief.includes('…'), row.brief);
  for (const brief of Object.values(ROLE_BRIEF)) assert.ok(brief.length <= 7, brief);
});

test('the helicopter shows only while active, as Air-1 Gull', () => {
  assert.equal(policeReport(fakePolice(), 0, 0).rows.some((row) => row.kind === 'air'), false);
  const air = policeReport(fakePolice({ heli: true }), 0, 0).rows.find((row) => row.kind === 'air');
  assert.equal(air.call, 'Air-1 Gull');
  assert.equal(air.metres, 50);
  assert.equal(air.state, 'Eyes on');
});

test('units count responding cars, officers on foot, the helicopter and roadblocks, not cars on the way back', () => {
  // Two cars still on it (the third returns), two officers standing and one roadblock.
  assert.equal(policeReport(fakePolice(), 0, 0).responding, 5);
  assert.equal(policeReport(fakePolice({ heli: true }), 0, 0).responding, 6);
});

test('every state the report gives has a chip key of its own', () => {
  const states = [...Object.values(MODE_STATE), 'Eyes on', 'Holding'];
  assert.deepEqual(states.map(stateKey), ['pursuit', 'search', 'return', 'eyes-on', 'holding']);
});

test('officers count only the active ones still standing; an empty force reports nothing', () => {
  assert.equal(policeReport(fakePolice(), 0, 0).officers, 2);
  const empty = policeReport({ units: { units: [] }, officers: { pool: [] } }, 0, 0);
  assert.deepEqual(empty, { rows: [], cars: 0, officers: 0, responding: 0, nearest: null });
});
