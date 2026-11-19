// Browser runs: --shots renders each ?shot scene to screenshots/, --nohud also saves HUD-less copies to
// tmp/look/, --perf measures FPS and draw calls of the live drive scene at 1440x900 on the real GPU.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome, startServer, panelBoxes, ROOT, sleep } from './cdp.mjs';
import { hudLayout } from './look-metrics.mjs';
import { SHOT_LIST } from './shot-list.mjs';

const MAX_BYTES = 256 * 1024;
const args = new Set(process.argv.slice(2));

async function openScene(page, url, errors) {
  errors.length = 0;
  await page.send('Page.navigate', { url });
  const start = Date.now();
  while (Date.now() - start < 90000) {
    await sleep(250);
    const ready = await page.evaluate('window.__shotReady === true').catch(() => false);
    if (ready) return;
    if (errors.length) break;
  }
  if (errors.length) throw new Error(`console errors on ${url}:\n${errors.join('\n')}`);
  throw new Error(`scene never became ready: ${url}`);
}

async function capture(page) {
  for (let quality = 90; quality >= 40; quality -= 5) {
    const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality });
    const bytes = Buffer.from(data, 'base64');
    if (bytes.length <= MAX_BYTES) return { bytes, quality };
  }
  throw new Error('could not fit the screenshot under 256 KiB');
}

function watchErrors(page) {
  const errors = [];
  page.on('Runtime.exceptionThrown', (event) => errors.push(event.exceptionDetails?.exception?.description
    ?? event.exceptionDetails?.text));
  page.on('Runtime.consoleAPICalled', (event) => {
    if (event.type === 'error' || event.type === 'warning') {
      errors.push(`${event.type}: ${event.args.map((a) => a.value ?? a.description).join(' ')}`);
    }
  });
  page.on('Log.entryAdded', (event) => {
    if (event.entry.level === 'error') errors.push(`log: ${event.entry.text} ${event.entry.url ?? ''}`);
  });
  return errors;
}

/** Every panel the cover must show, by its selector in the HUD. */
const COVER_PANELS = {
  mission: '#hud .mission-panel.show', dispatch: '#hud .dispatch.show', wanted: '#hud .status .wanted',
  weapons: '#hud .weaponbar', card: '#hud .dialogue-card.show', minimap: '#hud .minimap', radio: '#hud .radio',
  speedo: '#hud .speedo',
};

/** The cover's HUD panels are all there, on screen, apart and readable at contact-sheet size, or the run fails. */
async function checkCover(page) {
  const boxes = await panelBoxes(page, COVER_PANELS);
  const result = hudLayout(boxes, { width: 1280, height: 800 });
  const fonts = Object.entries(boxes).map(([name, box]) => `${name} ${box ? box.font : '-'}px`).join(', ');
  console.log(`cover HUD: ${result.ok ? 'ok' : 'FAILED'} (smallest text: ${fonts})`);
  if (!result.ok) throw new Error(`cover HUD layout: ${JSON.stringify(result)}`);
}

async function runShots(server, nohud) {
  const chrome = await launchChrome({ width: 1280, height: 800, port: 9334 });
  try {
    const { page } = chrome;
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    const errors = watchErrors(page);
    const metrics = { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false };
    await page.send('Emulation.setDeviceMetricsOverride', metrics);
    mkdirSync(join(ROOT, 'screenshots'), { recursive: true });
    mkdirSync(join(ROOT, 'tmp', 'look'), { recursive: true });
    for (const shot of SHOT_LIST) {
      const variants = nohud ? [['', 'screenshots'], ['&hud=0', 'tmp/look']] : [['', 'screenshots']];
      for (const [extra, folder] of variants) {
        const started = Date.now();
        await openScene(page, `${server.url}index.html?shot=${shot.name}&seed=1${extra}`, errors);
        if (errors.length) throw new Error(`console errors in ${shot.name}:\n${errors.join('\n')}`);
        const { bytes, quality } = await capture(page);
        writeFileSync(join(ROOT, folder, shot.file), bytes);
        if (shot === SHOT_LIST[0] && !extra) await checkCover(page);
        const state = await page.evaluate('JSON.stringify(window.__meridian.getState())');
        const seconds = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`${folder}/${shot.file}: ${(bytes.length / 1024).toFixed(0)} KiB q${quality} ${seconds}s ${state}`);
      }
    }
  } finally {
    await chrome.stop();
  }
}

async function runPerf(server) {
  const chrome = await launchChrome({ width: 1440, height: 900, port: 9335 });
  try {
    const { page } = chrome;
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    const errors = watchErrors(page);
    const dprArg = process.argv.find((arg) => arg.startsWith('--dpr='));
    const deviceScaleFactor = dprArg ? Number(dprArg.slice(6)) : 1.5;
    const metrics = { width: 1440, height: 900, deviceScaleFactor, mobile: false };
    await page.send('Emulation.setDeviceMetricsOverride', metrics);
    const scaleArg = process.argv.find((arg) => arg.startsWith('--scale='));
    const extra = scaleArg ? `&scale=${scaleArg.slice(8)}` : '';
    await openScene(page, `${server.url}index.html?shot=drive&seed=1&live=1${extra}`, errors);
    const gpu = await page.evaluate(`(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    })()`);
    await sleep(7000);
    const samples = [];
    for (let index = 0; index < 12; index += 1) {
      await sleep(500);
      samples.push(JSON.parse(await page.evaluate('JSON.stringify(window.__meridian.getState())')));
    }
    const mean = (key) => samples.reduce((sum, s) => sum + s[key], 0) / samples.length;
    const size = await page.evaluate('[innerWidth, innerHeight, devicePixelRatio, '
      + 'document.getElementById("game").width, document.getElementById("game").height]');
    console.log(JSON.stringify({
      gpu,
      viewport: size,
      fps: Math.round(mean('fps') * 10) / 10,
      frameMs: Math.round(mean('frameMs') * 100) / 100,
      drawCallsMax: Math.max(...samples.map((s) => s.drawCalls)),
      drawCallsMean: Math.round(mean('drawCalls')),
      triangles: Math.round(mean('triangles')),
      renderScale: samples.map((s) => s.renderScale).join(' '),
      errors,
    }));
  } finally {
    await chrome.stop();
  }
}

const server = await startServer(8131);
try {
  if (args.has('--shots')) await runShots(server, args.has('--nohud'));
  if (args.has('--perf')) await runPerf(server);
  if (!args.has('--shots') && !args.has('--perf')) {
    console.log('usage: node tests/browser.mjs --shots [--nohud] | --perf [--dpr=N] [--scale=S]');
  }
} finally {
  server.stop();
}
