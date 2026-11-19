// Story playthrough helpers: keys, the job's state, and one way to clear each stage type in a live headless game.
import { sleep } from './cdp.mjs';

const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  KeyE: { key: 'e', code: 'KeyE', keyCode: 69 },
};

export async function tap(page, name) {
  const k = KEYS[name];
  const base = { key: k.key, code: k.code, windowsVirtualKeyCode: k.keyCode };
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
  await sleep(80);
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await sleep(120);
}

const js = (page, source) => page.evaluate(source);
const M = 'window.__meridian.game';

export const state = async (page) => JSON.parse(await js(page, 'JSON.stringify(window.__meridian.getState())'));

/** The running job: id, phase (idle, intro, active, failed, outro), stage index and fail reason. */
export const job = async (page) => JSON.parse(await js(page, `JSON.stringify((() => { const s = ${M}.missions.state;
  return { id: s.run?.def.id ?? null, phase: s.phase, stage: s.run?.stage ?? -1, reason: s.run?.reason ?? null,
    cash: ${M}.player.state.wallet.cash }; })())`));

export async function boot(page, url) {
  await page.send('Page.navigate', { url });
  for (let i = 0; i < 150; i += 1) {
    await sleep(200);
    if (await js(page, 'Boolean(window.__meridian)').catch(() => false)) break;
  }
  await sleep(1500);
}

/** Wait up to `ms` for `test(job)` to hold; returns the last job state. */
export async function until(page, test, ms = 8000) {
  let now = await job(page);
  for (let t = 0; t < ms && !test(now); t += 150) {
    await sleep(150);
    now = await job(page);
  }
  return now;
}

/** Talk through dialogue: tap Enter while the job is in its intro or outro. */
export async function talkThrough(page) {
  for (let i = 0; i < 30; i += 1) {
    const { phase } = await job(page);
    if (phase !== 'intro' && phase !== 'outro') return;
    await tap(page, 'Enter');
  }
}

export async function leaveCar(page) {
  if ((await state(page)).mode !== 'driving') return;
  await tap(page, 'KeyE');
  for (let i = 0; i < 20 && (await state(page)).mode !== 'foot'; i += 1) await sleep(150);
}

/** Teleport Ilo on foot to a point expression, one metre out toward the street. */
const footAt = (page, point) => js(page, `(() => { const p = ${point};
  return window.__meridian.teleport(p.x + (p.outX ?? 0), p.z + (p.outZ ?? 0), 0); })()`);

/** Ilo walks up to the tagged mission car (or a fresh sedan when `tag` is null) and gets in with E. */
export async function enterCar(page, tag = null) {
  await leaveCar(page);
  const source = tag ? `${M}.missions.state.props.cars['${tag}'].car` : `(() => { const g = ${M};
    const car = g.fleet.add('sedan', '#3a7bd5'); const i = g.ilo.position;
    car.position.set(i.x + 3, i.y, i.z); car.heading = 0; car.parked = true; return car; })()`;
  await js(page, `(() => { const c = ${source};
    return window.__meridian.teleport(c.position.x + Math.cos(c.heading) * 2,
      c.position.z - Math.sin(c.heading) * 2, 0); })()`);
  await sleep(200);
  await tap(page, 'KeyE');
  for (let i = 0; i < 20 && (await state(page)).mode !== 'driving'; i += 1) await sleep(150);
  return (await state(page)).mode === 'driving';
}

/** Put the car Ilo drives at rest on a point expression. */
export const parkAt = (page, point, back = 0) => js(page, `(() => { const p = ${point};
  const v = ${M}.player.state.vehicle; if (!v) return false;
  const h = p.heading ?? 0; v.x = p.x - Math.sin(h) * ${back}; v.z = p.z - Math.cos(h) * ${back};
  v.vx = 0; v.vz = 0; v.speed = 0; return true; })()`);

/** The resolved point the current stage aims at: its place or the target it names. */
const STAGE_AIM = `(() => { const r = ${M}.missions.state.run; const s = r.def.stages[r.stage];
  return s.at ?? ${M}.missions.state.props.targets[s.target]; })()`;

/** Every member of crew `group` still standing takes a fatal hit (the fight itself is tested in play.mjs). */
export const drop = (page, group) => js(page, `${M}.characters.characters
  .filter((c) => c.owner?.kind === 'crew' && c.owner.group === '${group}' && !c.owner.down)
  .map((c) => c.owner.hurt({ damage: 999, dirX: 0, dirZ: 1 }).killed).length`);

/** Wait for the alarm a stage raised, check units answer, then let the search time out (stand the police down). */
async function shake(page) {
  let now = await state(page);
  for (let i = 0; i < 40 && (now.stars === 0 || now.policeUnits === 0); i += 1) {
    await sleep(150);
    now = await state(page);
  }
  await js(page, `${M}.action.police.standDown()`);
  return { stars: now.stars, units: now.policeUnits };
}

/** Keep the car 25 m behind a moving target until it arrives (never under 15 m, never over 40 m). */
async function tail(page, ms = 150000) {
  for (let t = 0; t < ms; t += 200) {
    const done = await js(page, `(() => { const r = ${M}.missions.state.run; if (!r) return true;
      const s = r.def.stages[r.stage]; const t = ${M}.missions.state.props.targets[s.target];
      if (s.type !== 'follow' || ${M}.missions.state.phase !== 'active') return true;
      const v = ${M}.player.state.vehicle; const d = Math.hypot(t.x - v.x, t.z - v.z) || 1;
      if (d > 40 || d < 15) { v.x = t.x - ((t.x - v.x) / d) * 25; v.z = t.z - ((t.z - v.z) / d) * 25;
        v.vx = 0; v.vz = 0; v.speed = 0; v.heading = Math.atan2(t.x - v.x, t.z - v.z); }
      return false; })()`);
    if (done) return;
    await sleep(200);
  }
}

/** Drive through each gate of the stage's course in turn. */
async function race(page) {
  for (let i = 0; i < 80; i += 1) {
    const { phase, stage } = await job(page);
    const gate = await js(page, `(() => { const t = ${STAGE_AIM}; return t?.arrived ? -1 : t?.gate ?? -1; })()`);
    if (phase !== 'active' || gate < 0) return { phase, stage };
    await parkAt(page, STAGE_AIM);
    await sleep(250);
  }
  return job(page);
}

/** Clear the current stage the way a player would (moving by teleport); returns what happened on the way. */
export async function clearStage(page) {
  const stage = JSON.parse(await js(page, `JSON.stringify((() => { const r = ${M}.missions.state.run;
    const { at, ...s } = r.def.stages[r.stage]; return s; })())`));
  const index = (await job(page)).stage;
  const out = { type: stage.type };
  if (stage.type === 'steal') out.entered = await enterCar(page, stage.car);
  else if (stage.type === 'goto' || (stage.type === 'deliver' && !stage.car && stage.onFoot)) {
    await leaveCar(page);
    await footAt(page, STAGE_AIM);
  } else if (stage.type === 'drive' || stage.type === 'deliver') {
    const tag = (await state(page)).mode === 'driving'
      ? await js(page, `${M}.player.state.car?.missionTag ?? null`) : undefined;
    if (stage.car ? tag !== stage.car : tag === undefined) await enterCar(page, stage.car ?? null);
    if (stage.alert) Object.assign(out, await shake(page));
    else if (stage.clean) await js(page, `${M}.action.police.standDown()`);
    await parkAt(page, STAGE_AIM);
  } else if (stage.type === 'defeat') out.dropped = await drop(page, stage.group);
  else if (stage.type === 'evade') Object.assign(out, await shake(page));
  else if (stage.type === 'follow') {
    if (stage.car && (await js(page, `${M}.player.state.car?.missionTag ?? null`)) !== stage.car) {
      await enterCar(page, stage.car);
    }
    if (stage.alert) Object.assign(out, await shake(page));
    await tail(page);
  } else if (stage.type === 'race') await race(page);
  else if (stage.type === 'buy') {
    await leaveCar(page);
    await js(page, `(() => { const a = ${STAGE_AIM}; const d = (e) => Math.hypot(e.x - a.x, e.z - a.z);
      const p = ${M}.services.shops.places.reduce((best, e) => (d(e) < d(best) ? e : best));
      return window.__meridian.teleport(p.x + p.outX * 0.6, p.z + p.outZ * 0.6, p.heading + Math.PI); })()`);
    await sleep(300);
    await tap(page, 'KeyE');
    await tap(page, 'Enter');
    await js(page, `${M}.services.shops.close?.()`);
  }
  const wait = (stage.wait ?? 0) * 1000 + 6000;
  const after = await until(page, (j) => j.stage !== index || j.phase !== 'active', wait);
  return { ...out, ...after };
}
