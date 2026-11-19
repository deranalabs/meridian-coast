// Gameplay smoke test: title, walk, mute, pause and settings, drive and stop, buy a pistol, fire, get a wanted star,
// see police respond, take mission one from the phone (fail it, retry, pass it, get paid), save at the safe house,
// reload and find the same cash; fails on any console error.
// PLAY_SHOTS=1 also saves the pause menu at 768x480 to tmp/play-pause.jpg.
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchChrome, startServer, sleep } from './cdp.mjs';

const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  KeyW: { key: 'w', code: 'KeyW', keyCode: 87 },
  KeyS: { key: 's', code: 'KeyS', keyCode: 83 },
  KeyA: { key: 'a', code: 'KeyA', keyCode: 65 },
  KeyE: { key: 'e', code: 'KeyE', keyCode: 69 },
  KeyQ: { key: 'q', code: 'KeyQ', keyCode: 81 },
  KeyF: { key: 'f', code: 'KeyF', keyCode: 70 },
  Digit2: { key: '2', code: 'Digit2', keyCode: 50 },
  KeyM: { key: 'm', code: 'KeyM', keyCode: 77 },
  KeyP: { key: 'p', code: 'KeyP', keyCode: 80 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  Space: { key: ' ', code: 'Space', keyCode: 32 },
};

async function key(page, name, type) {
  const k = KEYS[name];
  await page.send('Input.dispatchKeyEvent', { type, key: k.key, code: k.code, windowsVirtualKeyCode: k.keyCode });
}

async function tap(page, name) {
  await key(page, name, 'keyDown');
  await sleep(80);
  await key(page, name, 'keyUp');
  await sleep(120);
}

async function hold(page, names, ms) {
  for (const name of names) await key(page, name, 'keyDown');
  await sleep(ms);
  for (const name of names) await key(page, name, 'keyUp');
}

const state = async (page) => JSON.parse(await page.evaluate('JSON.stringify(window.__meridian.getState())'));

async function boot(page, url) {
  await page.send('Page.navigate', { url });
  await sleep(500);
  for (let i = 0; i < 150; i += 1) {
    await sleep(200);
    if (await page.evaluate('Boolean(window.__meridian)').catch(() => false)) break;
  }
  await sleep(1500);
}

/** Teleport Ilo in front of the named place (shops resolve their own spots on the sidewalk). */
const goTo = (page, id) => page.evaluate(`(() => { const m = window.__meridian;
  const p = m.game.services.shops.places.find((entry) => entry.id === '${id}');
  return m.teleport(p.x + p.outX * 0.6, p.z + p.outZ * 0.6, p.heading + Math.PI); })()`);

/** Teleport Ilo onto a story place (missions resolve these on the map). */
const goToMission = (page, id) => page.evaluate(`(() => { const m = window.__meridian;
  const p = m.game.missions.places.get('${id}');
  return m.teleport(p.x + p.outX, p.z + p.outZ, p.heading + Math.PI); })()`);

/** The running job: its phase (idle, intro, active, failed, outro), stage label and whether it failed. */
const job = (page) => page.evaluate(`(() => { const m = window.__meridian.game.missions; const v = m.hudView();
  return { phase: m.state.phase, stage: v?.stage ?? null, failed: Boolean(v?.failed) }; })()`);

const server = await startServer(8135);
const chrome = await launchChrome({ port: 9337 });
const errors = [];
const checks = [];
const check = (name, ok) => checks.push([name, Boolean(ok)]);
try {
  const { page } = chrome;
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails?.exception?.description));
  page.on('Runtime.consoleAPICalled', (e) => {
    if (e.type === 'error' || e.type === 'warning') errors.push(e.args.map((a) => a.value ?? a.description).join(' '));
  });
  const metrics = { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false };
  await page.send('Emulation.setDeviceMetricsOverride', metrics);
  await boot(page, `${server.url}index.html?seed=1&fresh=1`);
  await tap(page, 'Enter');
  await sleep(400);
  const start = await state(page);
  await hold(page, ['KeyW'], 1200);
  const walked = await state(page);
  check('title dismissed and on foot', start.mode === 'foot');
  check('walking moves the camera', walked.camera.join() !== start.camera.join());
  check('first key press unlocks audio', walked.audio === 'running' || walked.audio === 'suspended');
  await page.evaluate(`(() => { const m = window.__meridian; const car = m.game.fleet.add('coupe', '#f0a800');
    car.position.set(102, 0, -10); car.heading = Math.PI; car.parked = true;
    for (const other of m.game.fleet.cars) if (other !== car && other.parked
      && Math.abs(other.position.x - 102) < 9 && other.position.z < 0 && other.position.z > -90) other.visible = false;
    m.teleport(99.6, -10, Math.PI / 2); })()`);
  await sleep(300);
  await tap(page, 'KeyE');
  await sleep(1500);
  check('E takes a nearby car', (await state(page)).mode === 'driving');
  await hold(page, ['KeyW'], 2500);
  const driving = await state(page);
  check('throttle builds speed', driving.speedKmh > 12);
  await hold(page, ['KeyW', 'KeyA', 'Space'], 900);
  let pedal = null;
  let calm = 0;
  for (let i = 0; i < 160; i += 1) {
    const now = await state(page);
    const speed = now.forwardKmh;
    if (process.env.PLAY_DEBUG) console.log(i, speed, now.mode, now.stars, now.time);
    // After the handbrake turn the car can slide sideways with little forward speed, so the brake has to hold
    // calm for a while (handbrake on) before the car counts as stopped.
    const want = speed > 4 ? 'KeyS' : speed < -4 ? 'KeyW' : 'Space';
    calm = want === 'Space' && now.speedKmh < 4 ? calm + 1 : 0;
    if (want !== pedal) {
      if (pedal) await key(page, pedal, 'keyUp');
      await key(page, want, 'keyDown');
      pedal = want;
    }
    if (calm >= 8) break;
    await sleep(40);
  }
  if (pedal) await key(page, pedal, 'keyUp');
  await sleep(200);
  const stopped = await state(page);
  await tap(page, 'KeyE');
  await sleep(1500);
  check('braking slows the car', stopped.speedKmh < 15);
  check('E leaves the car', (await state(page)).mode === 'foot');

  await goTo(page, 'gun');
  await sleep(300);
  await tap(page, 'KeyE');
  const inShop = await state(page);
  check('E opens Halcyon Arms', inShop.shop === 'gun');
  await tap(page, 'Enter');
  await tap(page, 'Escape');
  const bought = await state(page);
  const owned = await page.evaluate('Boolean(window.__meridian.game.player.state.arsenal.owned.pistol)');
  check('buying the Harbor 9 takes $450', owned && bought.cash === inShop.cash - 450 && bought.shop === null);
  await tap(page, 'Digit2');
  check('2 draws the pistol', (await state(page)).weapon === 'pistol');
  await page.evaluate(`(() => { const g = window.__meridian.game; const i = g.ilo;
    const ped = g.pedestrians.peds[0].character; const x = i.position.x + Math.sin(i.heading) * 5;
    const z = i.position.z + Math.cos(i.heading) * 5; ped.position.set(x, i.position.y, z); })()`);
  await key(page, 'KeyQ', 'keyDown');
  for (let shot = 0; shot < 6; shot += 1) await tap(page, 'KeyF');
  await key(page, 'KeyQ', 'keyUp');
  await sleep(800);
  const fired = await page.evaluate('window.__meridian.game.player.state.arsenal.shotsFired');
  check('F fires the pistol', fired > 0);
  // A witness may phone it in a moment after the shots, so give the star a few seconds to appear.
  let stars = 0;
  for (let i = 0; i < 20 && stars === 0; i += 1) {
    stars = (await state(page)).stars;
    if (!stars) await sleep(200);
  }
  check('shooting someone raises a wanted star', stars >= 1);
  let units = 0;
  for (let i = 0; i < 60 && units === 0; i += 1) {
    await sleep(250);
    units = (await state(page)).policeUnits;
  }
  check('police units respond', units > 0);

  await page.evaluate('window.__meridian.game.action.police.standDown()');

  // Mute, pause, turn the volume down one notch in Settings, back out and resume.
  await tap(page, 'KeyM');
  const muted = (await state(page)).muted;
  await tap(page, 'KeyM');
  check('M toggles mute', muted === true && (await state(page)).muted === false);
  await tap(page, 'Escape');
  const paused = await state(page);
  await sleep(400);
  check('Esc pauses the game', paused.paused && (await state(page)).time === paused.time);
  await tap(page, 'ArrowDown');
  await tap(page, 'Enter');
  await tap(page, 'ArrowLeft');
  const quieter = await state(page);
  const expected = Math.max(0, Math.round((paused.volume - 0.1) * 10) / 10);
  check('settings turn the volume down', Math.abs(quieter.volume - expected) < 1e-6);
  if (process.env.PLAY_SHOTS) {
    await page.send('Emulation.setDeviceMetricsOverride', { ...metrics, width: 768, height: 480 });
    await sleep(300);
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    mkdirSync('tmp', { recursive: true });
    writeFileSync('tmp/play-pause.jpg', Buffer.from(data, 'base64'));
    await page.send('Emulation.setDeviceMetricsOverride', metrics);
  }
  await tap(page, 'Escape');
  await tap(page, 'Escape');
  await sleep(300);
  const resumed = await state(page);
  check('Esc twice resumes play', !resumed.paused && resumed.time > paused.time);

  // Mission one from the phone: take it, reach the kiosk, bring the police (fail), retry, hand over, get paid.
  await tap(page, 'KeyP');
  check('P opens the phone', await page.evaluate('window.__meridian.game.phone.isOpen'));
  await tap(page, 'Enter');
  check('Enter on the phone starts mission one', (await job(page)).phase === 'intro');
  for (let i = 0; i < 20 && (await job(page)).phase === 'intro'; i += 1) await tap(page, 'Enter');
  check('the intro plays out to the first objective', (await job(page)).phase === 'active');
  await goToMission(page, 'newsbox');
  await sleep(600);
  check('reaching the kiosk marker clears stage one', (await job(page)).stage === 'Stage 2 of 2');
  await page.evaluate('(() => { const g = window.__meridian.game; const i = g.ilo.position; '
    + 'g.action.police.alert(1, i.x, i.z); })()');
  await sleep(500);
  check('police on your heels fail the job', (await job(page)).failed);
  await tap(page, 'Enter');
  await sleep(300);
  const retried = await job(page);
  check('Enter retries from the checkpoint', !retried.failed && retried.stage === 'Stage 2 of 2'
    && (await state(page)).stars === 0);
  const unpaid = (await state(page)).cash;
  await goToMission(page, 'pell-hotel');
  await sleep(2600);
  for (let i = 0; i < 20 && (await job(page)).phase === 'outro'; i += 1) await tap(page, 'Enter');
  const paid = await state(page);
  check('mission one pays $1,200 into the wallet', paid.cash === unpaid + 1200 && (await job(page)).phase === 'idle');
  check('mission two opens on the phone', await page.evaluate(
    "window.__meridian.game.missions.available().some((def) => def.id === 'salt-and-chrome')"));

  await goTo(page, 'safehouse');
  await sleep(300);
  await tap(page, 'KeyE');
  check('E opens the safe house', (await state(page)).shop === 'safehouse');
  await tap(page, 'Enter');
  await tap(page, 'Escape');
  const saved = await state(page);
  await boot(page, `${server.url}index.html?seed=1`);
  const reloaded = await state(page);
  const pistol = await page.evaluate('Boolean(window.__meridian.game.player.state.arsenal.owned.pistol)');
  check('reload restores the saved cash and pistol', reloaded.cash === saved.cash && pistol);

  for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(JSON.stringify({ driving: driving.speedKmh, stopped: stopped.speedKmh, cash: saved.cash,
    reloadedCash: reloaded.cash, units, fps: reloaded.fps, drawCalls: reloaded.drawCalls }));
  if (errors.length) console.log(`console errors:\n${errors.join('\n')}`);
  if (errors.length || checks.some(([, ok]) => !ok)) process.exitCode = 1;
} finally {
  await chrome.stop();
  server.stop();
}
