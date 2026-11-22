// Unit tests for the dispatch report: the job each unit is doing, call signs, order and the responding count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { policeReport, callSign, jobKey, JOBS } from './report.js';

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

/** The job on the chip of a single car in this state. */
function carJob(role, mode, officersOut = false) {
  const police = { units: { units: [unit(0, 5, 0, role, mode, officersOut)] }, officers: { pool: [] } };
  return policeReport(police, 0, 0).rows[0].job;
}

test('rows are sorted nearest first and nearest is the first distance', () => {
  const report = policeReport(fakePolice(), 0, 0);
  const metres = report.rows.map((row) => row.metres);
  assert.deepEqual(metres, [...metres].sort((a, b) => a - b));
  assert.equal(report.nearest, 10);
  assert.equal(report.cars, 3);
});

test('cruisers get stable radio call signs', () => {
  const cars = policeReport(fakePolice(), 0, 0).rows.filter((row) => row.kind === 'car');
  assert.equal(cars.length, 3);
  const first = cars.find((row) => row.metres === 30);
  assert.equal(first.call, callSign(1));
  assert.match(first.call, /^\d-[A-Z][a-z]+-\d+$/);
  assert.notEqual(callSign(1), callSign(2));
});

test('a pursuing car says what its role does', () => {
  assert.equal(carJob('ram', 'pursue'), 'RAMMING');
  assert.equal(carJob('left', 'pursue'), 'FLANKING');
  assert.equal(carJob('right', 'pursue'), 'FLANKING');
  assert.equal(carJob('block', 'pursue'), 'CUTTING OFF');
});

test('a car without a known role is driven as a rammer, so it reads as one', () => {
  assert.equal(carJob(undefined, 'pursue'), 'RAMMING');
});

test('the mode outranks the role: officers out, then a search; a car going back is only returning', () => {
  assert.equal(carJob('ram', 'search'), 'SEARCHING');
  assert.equal(carJob('block', 'leave'), 'RETURNING');
  assert.equal(carJob('left', 'pursue', true), 'ON FOOT');
  assert.equal(carJob('left', 'search', true), 'ON FOOT');
  assert.equal(carJob('left', 'leave', true), 'RETURNING');
});

test('the helicopter shows only while active, on the spotlight or overhead', () => {
  assert.equal(policeReport(fakePolice(), 0, 0).rows.some((row) => row.kind === 'air'), false);
  const airRow = (police) => policeReport(police, 0, 0).rows.find((row) => row.kind === 'air');
  const police = fakePolice({ heli: true });
  assert.deepEqual(airRow(police), { call: 'Air-1 Gull', kind: 'air', metres: 50, job: 'SPOTLIGHT' });
  police.helicopter.state.spot = null;
  assert.equal(airRow(police).job, 'OVERHEAD');
});

test('a roadblock is a row of its own', () => {
  const block = policeReport(fakePolice(), 0, 0).rows.find((row) => row.kind === 'block');
  assert.deepEqual(block, { call: 'Roadblock', kind: 'block', metres: 10, job: 'ROADBLOCK' });
});

test('there are nine jobs, each in caps, short enough for its chip, with a chip key of its own', () => {
  const words = Object.values(JOBS);
  assert.deepEqual(words.map(jobKey), ['ramming', 'flanking', 'cutting-off', 'on-foot', 'spotlight', 'overhead',
    'roadblock', 'searching', 'returning']);
  for (const word of words) assert.ok(word === word.toUpperCase() && word.length <= 11 && !word.includes('…'), word);
});

test('units count responding cars, officers on foot, the helicopter and roadblocks, not cars on the way back', () => {
  // Two cars still on it (the third returns), two officers standing and one roadblock.
  assert.equal(policeReport(fakePolice(), 0, 0).responding, 5);
  assert.equal(policeReport(fakePolice({ heli: true }), 0, 0).responding, 6);
});

test('officers count only the active ones still standing; an empty force reports nothing', () => {
  assert.equal(policeReport(fakePolice(), 0, 0).officers, 2);
  const empty = policeReport({ units: { units: [] }, officers: { pool: [] } }, 0, 0);
  assert.deepEqual(empty, { rows: [], cars: 0, officers: 0, responding: 0, nearest: null });
});
