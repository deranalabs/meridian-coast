// The job card's steps and reward, checked against the real story, and the reward count-up.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORY_MISSIONS } from './story/index.js';
import { stepName, stepList, rewardParts, countUp } from './steplist.js';

test('every story stage has a short step name', () => {
  for (const def of STORY_MISSIONS) {
    for (const stage of def.stages) {
      const name = stepName(stage);
      assert.ok(name.length > 0 && name.length <= 12, `${def.id}: "${name}"`);
      assert.notEqual(name, 'Step', `${def.id} has a stage of unknown type ${stage.type}`);
    }
  }
});

test('a "Vault:" prefix names the step; a long sentence falls back to the type', () => {
  assert.equal(stepName({ type: 'deliver', text: 'Vault: hold the lance on the door' }), 'Vault');
  assert.equal(stepName({ type: 'drive', text: 'Drive the linen van into the Aurelio service lane' }), 'Drive');
  assert.equal(stepName({ type: 'evade', text: 'Lose them', step: 'Getaway' }), 'Getaway');
});

test('the step list ticks what is done, marks now and leaves the rest', () => {
  const def = STORY_MISSIONS.at(-1);
  const steps = stepList({ def, stage: 3 });
  assert.equal(steps.length, def.stages.length);
  assert.deepEqual(steps.map((s) => s.state), ['done', 'done', 'done', 'now', 'todo']);
});

test('the card shows the job\'s real reward', () => {
  const def = STORY_MISSIONS.at(-1);
  assert.deepEqual(rewardParts(def), { cash: `$${def.reward.cash.toLocaleString('en-US')}`,
    respect: `+${def.reward.respect} respect` });
  assert.equal(rewardParts({}), null);
});

test('the count-up starts at 0, rises without going back and lands exactly on the reward', () => {
  assert.equal(countUp(40000, 0), 0);
  let last = 0;
  for (let s = 0.05; s < 1.2; s += 0.05) {
    const shown = countUp(40000, s);
    assert.ok(shown >= last && shown <= 40000);
    last = shown;
  }
  assert.equal(countUp(40000, 1.2), 40000);
  assert.equal(countUp(40000, 9), 40000);
});
