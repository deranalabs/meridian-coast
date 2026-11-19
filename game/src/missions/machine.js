// Mission state machine: stages in order, checkpoints, failure with a clean restart, and a single pass.
import { checkObjective } from './objectives.js';
import { checkFailures } from './failures.js';

/** A fresh run of a resolved mission definition. */
export function createRun(def) {
  if (!def?.stages?.length) throw new Error('A mission needs at least one stage');
  return { def, status: 'active', stage: 0, checkpoint: 0, memo: {}, reason: null, time: 0, stageTime: 0,
    attempts: 1 };
}

export const currentStage = (run) => run.def.stages[run.stage];

/** Seconds left on a timed stage (`limit`), or null when the stage has no clock. */
export function timeLeft(run) {
  const limit = currentStage(run).limit;
  return limit ? Math.max(0, limit - run.stageTime) : null;
}

/** m:ss for a clock. */
export const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** "Stage n of m" for the HUD, with the clock on a timed stage. */
export function stageLabel(run) {
  const left = timeLeft(run);
  const label = `Stage ${run.stage + 1} of ${run.def.stages.length}`;
  return left === null ? label : `${label} · ${clock(Math.ceil(left))}`;
}

/** The objective text for now and the one after it (null on the last stage). */
export function stageTexts(run) {
  const stages = run.def.stages;
  const stage = stages[run.stage];
  const following = stages[run.stage + 1];
  return { objective: stage.text, next: stage.next ?? following?.text ?? null };
}

function enter(run, index, events) {
  run.stage = index;
  run.memo = {};
  run.stageTime = 0;
  if (index === 0 || run.def.stages[index].checkpoint) run.checkpoint = index;
  events.push({ type: 'stage', index, stage: run.def.stages[index] });
}

/** Fail the run (once); any later step does nothing until a restart. */
export function failRun(run, reason) {
  if (run.status !== 'active') return [];
  run.status = 'failed';
  run.reason = reason;
  return [{ type: 'failed', reason, stage: run.stage }];
}

/**
 * Advance the run by dt against the view. Returns a list of events: {type: 'stage'}, {type: 'failed', reason}
 * and {type: 'passed'}. Several stages may finish in one step when their objectives already hold.
 */
export function stepRun(run, view, dt) {
  const events = [];
  if (run.status !== 'active') return events;
  run.time += dt;
  run.stageTime += dt;
  for (let guard = 0; guard < run.def.stages.length; guard += 1) {
    const stage = currentStage(run);
    const failure = checkFailures(run.def, stage, view);
    if (failure) return events.concat(failRun(run, failure));
    if (guard === 0 && timeLeft(run) === 0) return events.concat(failRun(run, 'time'));
    const result = checkObjective(stage, view, run.memo, guard === 0 ? dt : 0);
    if (result?.startsWith('fail:')) return events.concat(failRun(run, result.slice(5)));
    if (result !== 'done') break;
    events.push({ type: 'cleared', index: run.stage, stage });
    if (run.stage + 1 >= run.def.stages.length) {
      run.status = 'passed';
      events.push({ type: 'passed' });
      break;
    }
    enter(run, run.stage + 1, events);
  }
  return events;
}

/** Restart a failed run from its last checkpoint; returns the stage event so the world can set it up again. */
export function restartRun(run) {
  if (run.status !== 'failed') return [];
  run.status = 'active';
  run.reason = null;
  run.attempts += 1;
  const events = [];
  enter(run, run.checkpoint, events);
  events[0].restart = true;
  return events;
}
