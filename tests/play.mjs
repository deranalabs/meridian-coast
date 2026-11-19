// Gameplay smoke test: opens the live game, starts from the title, walks, takes a car with E, drives with a
// handbrake turn, stops and gets out, failing on any console error or a mode that never changes.
import { launchChrome, startServer, sleep } from './cdp.mjs';

const KEYS = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  KeyW: { key: 'w', code: 'KeyW', keyCode: 87 },
  KeyS: { key: 's', code: 'KeyS', keyCode: 83 },
  KeyA: { key: 'a', code: 'KeyA', keyCode: 65 },
  KeyE: { key: 'e', code: 'KeyE', keyCode: 69 },
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
}

async function hold(page, names, ms) {
  for (const name of names) await key(page, name, 'keyDown');
  await sleep(ms);
  for (const name of names) await key(page, name, 'keyUp');
}

const state = async (page) => JSON.parse(await page.evaluate('JSON.stringify(window.__meridian.getState())'));

const server = await startServer(8135);
const chrome = await launchChrome({ port: 9337 });
const errors = [];
const checks = [];
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
  await page.send('Page.navigate', { url: `${server.url}index.html?seed=1` });
  for (let i = 0; i < 150; i += 1) {
    await sleep(200);
    if (await page.evaluate('Boolean(window.__meridian)').catch(() => false)) break;
  }
  await sleep(1500);
  await tap(page, 'Enter');
  await sleep(500);
  const start = await state(page);
  await hold(page, ['KeyW'], 1200);
  const walked = await state(page);
  checks.push(['title dismissed and on foot', start.mode === 'foot']);
  checks.push(['walking moves the camera', walked.camera.join() !== start.camera.join()]);
  await page.evaluate(`(() => { const m = window.__meridian; const car = m.game.fleet.add('coupe', '#f0a800');
    car.position.set(102, 0, -10); car.heading = Math.PI; car.parked = true;
    for (const other of m.game.fleet.cars) if (other !== car && other.parked
      && Math.abs(other.position.x - 102) < 9 && other.position.z < 0 && other.position.z > -90) other.visible = false;
    m.teleport(99.6, -10, Math.PI / 2); })()`);
  await sleep(300);
  await tap(page, 'KeyE');
  await sleep(1600);
  const entered = await state(page);
  checks.push(['E takes a nearby car', entered.mode === 'driving']);
  await hold(page, ['KeyW'], 2500);
  const driving = await state(page);
  checks.push(['throttle builds speed', driving.speedKmh > 12]);
  await hold(page, ['KeyW', 'KeyA', 'Space'], 900);
  await key(page, 'KeyS', 'keyDown');
  for (let i = 0; i < 80 && (await state(page)).speedKmh > 10; i += 1) await sleep(50);
  await key(page, 'KeyS', 'keyUp');
  await key(page, 'Space', 'keyDown');
  for (let i = 0; i < 60 && (await state(page)).speedKmh > 3; i += 1) await sleep(100);
  await key(page, 'Space', 'keyUp');
  await sleep(300);
  const stopped = await state(page);
  await tap(page, 'KeyE');
  await sleep(1500);
  const out = await state(page);
  checks.push(['braking slows the car', stopped.speedKmh < 15]);
  checks.push(['E leaves the car', out.mode === 'foot']);
  for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(JSON.stringify({ walked: walked.camera, driving: driving.speedKmh, stopped: stopped.speedKmh,
    fps: out.fps, drawCalls: out.drawCalls }));
  if (errors.length) console.log(`console errors:\n${errors.join('\n')}`);
  if (errors.length || checks.some(([, ok]) => !ok)) process.exitCode = 1;
} finally {
  await chrome.stop();
  server.stop();
}
