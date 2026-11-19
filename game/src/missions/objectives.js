// Mission objectives: one pure check per objective type, reading a plain view of the world each step.

/** The objective types a stage may use, with the words the HUD shows for them. */
export const OBJECTIVE_TYPES = Object.freeze({
  goto: 'Go to',
  drive: 'Drive to',
  steal: 'Steal',
  follow: 'Follow',
  defeat: 'Defeat',
  evade: 'Lose the police',
  deliver: 'Deliver',
});

const CLOSE_GRACE = 3;

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Is the player in the right vehicle for a stage that names one (any car when none is named)? */
export function inStageCar(stage, view) {
  if (!view.driving) return false;
  return !stage.car || view.carTag === stage.car;
}

/** Where the stage points the player: its marker, a target's position, or null. */
export function stageTarget(stage, view) {
  if (stage.at) return stage.at;
  if (stage.target) return view.targets?.[stage.target] ?? null;
  if (stage.type === 'steal' && stage.car) return view.cars?.[stage.car] ?? null;
  return null;
}

function gotoCheck(stage, view) {
  if (stage.onFoot && view.driving) return null;
  return distance(view, stage.at) <= (stage.radius ?? 4) ? 'done' : null;
}

function driveCheck(stage, view) {
  return inStageCar(stage, view) && distance(view, stage.at) <= (stage.radius ?? 6) ? 'done' : null;
}

function followCheck(stage, view, memo, dt) {
  const target = view.targets?.[stage.target];
  if (!target) return null;
  const d = distance(view, target);
  memo.metres = d;
  if (d > (stage.max ?? 90)) return 'fail:too-far';
  if (d < (stage.min ?? 0)) {
    memo.close = (memo.close ?? 0) + dt;
    if (memo.close > (stage.closeGrace ?? CLOSE_GRACE)) return 'fail:spotted';
  } else memo.close = 0;
  return target.arrived ? 'done' : null;
}

function defeatCheck(stage, view, memo) {
  const left = view.enemies?.[stage.group];
  if (left === undefined) return null;
  memo.left = left;
  return left <= 0 ? 'done' : null;
}

function deliverCheck(stage, view, memo, dt) {
  const there = distance(view, stage.at) <= (stage.radius ?? 6);
  const carOk = stage.car ? inStageCar(stage, view) : !(stage.onFoot && view.driving);
  const ready = there && carOk && (!stage.clean || view.stars === 0);
  memo.wait = ready ? (memo.wait ?? 0) + dt : 0;
  memo.progress = Math.min(1, memo.wait / (stage.wait ?? 2));
  return memo.wait >= (stage.wait ?? 2) ? 'done' : null;
}

/** Clear when the stars are gone; a stage that raises the alarm (`alert`) must first see them go up. */
function evadeCheck(stage, view, memo) {
  if (view.stars > 0) memo.hot = true;
  if (stage.alert && !memo.hot) return null;
  return view.stars === 0 ? 'done' : null;
}

const CHECKS = {
  goto: gotoCheck,
  drive: driveCheck,
  steal: (stage, view) => (inStageCar(stage, view) ? 'done' : null),
  follow: followCheck,
  defeat: defeatCheck,
  evade: evadeCheck,
  deliver: deliverCheck,
};

/**
 * Check one stage against the view: returns 'done', 'fail:<reason>' or null (still going). `memo` is the
 * stage's own scratch state (timers, counts) and is reset when the stage starts or restarts.
 */
export function checkObjective(stage, view, memo, dt) {
  const check = CHECKS[stage.type];
  if (!check) throw new Error(`Unknown objective type: ${stage.type}`);
  return check(stage, view, memo, dt);
}
