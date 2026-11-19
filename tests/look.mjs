// Look test: decodes each screenshot in headless Chrome, downscales it to 768x480 and reports the metrics
// against the targets; HUD-less copies in tmp/look/ (from browser.mjs --shots --nohud) are measured too.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome, ROOT } from './cdp.mjs';
import { measure } from './look-metrics.mjs';
import { SHOT_LIST } from './shot-list.mjs';

const WIDTH = 768;
const HEIGHT = 480;
const TARGETS = {
  cover: { gradEnergy: [7.5, Infinity], flatBlocks: [0, 0.33], colors: [150, Infinity], brightShare: [0.015, 0.04],
    meanSat: [0.35, 0.47] },
  foot: { gradEnergy: [6.5, Infinity], flatBlocks: [0, 0.4] },
};

async function decode(page, file) {
  const base64 = readFileSync(file).toString('base64');
  const script = `(async () => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,${base64}';
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = ${WIDTH};
    canvas.height = ${HEIGHT};
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, ${WIDTH}, ${HEIGHT});
    const data = ctx.getImageData(0, 0, ${WIDTH}, ${HEIGHT}).data;
    let binary = '';
    for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i, i + 8192));
    return btoa(binary);
  })()`;
  return new Uint8ClampedArray(Buffer.from(await page.evaluate(script), 'base64'));
}

function verdict(metrics, targets) {
  if (!targets) return '';
  const misses = Object.entries(targets).filter(([key, [lo, hi]]) => metrics[key] < lo || metrics[key] > hi);
  return misses.length ? `MISS ${misses.map(([key]) => key).join(', ')}` : 'all targets met';
}

function format(metrics) {
  return `gradEnergy ${metrics.gradEnergy.toFixed(2)}  flatBlocks ${metrics.flatBlocks.toFixed(3)}  `
    + `colors ${metrics.colors}  brightShare ${(metrics.brightShare * 100).toFixed(2)}%  `
    + `meanSat ${metrics.meanSat.toFixed(3)}`;
}

const chrome = await launchChrome({ gpu: false, port: 9336 });
try {
  const { page } = chrome;
  await page.send('Runtime.enable');
  const results = {};
  for (const [index, shot] of SHOT_LIST.entries()) {
    const targets = index === 0 ? TARGETS.cover : shot.name === 'foot' ? TARGETS.foot : null;
    for (const [label, folder] of [['hud', 'screenshots'], ['no hud', join('tmp', 'look')]]) {
      const file = join(ROOT, folder, shot.file);
      if (!existsSync(file)) continue;
      const metrics = measure(await decode(page, file), WIDTH, HEIGHT);
      results[`${shot.file} (${label})`] = metrics;
      console.log(`${shot.file.padEnd(12)} ${label.padEnd(6)} ${format(metrics)}  ${verdict(metrics, targets)}`);
    }
  }
} finally {
  await chrome.stop();
}
