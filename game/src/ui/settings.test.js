// Unit tests for the settings store (normalise, step, storage round trip) and the theme's CSS variable names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseSettings, stepSetting, createSettings, loadSettings, DEFAULT_SETTINGS } from './settings.js';
import { cssName, themeVariables } from './theme.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test('broken settings fall back to the defaults', () => {
  assert.deepEqual(normaliseSettings(null), { ...DEFAULT_SETTINGS });
  assert.deepEqual(normaliseSettings({ volume: 9, muted: 'yes', minimap: 'huge' }),
    { volume: 1, muted: false, minimap: 'normal' });
  const broken = { getItem: () => '{not json', setItem: () => { throw new Error('full'); } };
  assert.deepEqual(loadSettings(broken), { ...DEFAULT_SETTINGS });
});

test('stepping moves volume by tenths, flips mute and walks the minimap sizes', () => {
  const s = { volume: 0.8, muted: false, minimap: 'normal' };
  assert.equal(stepSetting(s, 'volume', 1).volume, 0.9);
  assert.equal(stepSetting(stepSetting(s, 'volume', 1), 'volume', 1).volume, 1);
  assert.equal(stepSetting({ ...s, volume: 1 }, 'volume', 1).volume, 1);
  assert.equal(stepSetting({ ...s, volume: 0 }, 'volume', -1).volume, 0);
  assert.equal(stepSetting(s, 'muted', 1).muted, true);
  assert.equal(stepSetting(s, 'minimap', 1).minimap, 'large');
  assert.equal(stepSetting(s, 'minimap', -1).minimap, 'small');
  assert.equal(stepSetting({ ...s, minimap: 'large' }, 'minimap', 1).minimap, 'large');
});

test('the live store saves every change and tells its listeners', () => {
  const storage = memory();
  const settings = createSettings(storage);
  const seen = [];
  settings.onChange((s) => seen.push(s.volume));
  settings.change('volume', -1);
  assert.deepEqual(seen, [0.8, 0.7]);
  assert.equal(createSettings(storage).get().volume, 0.7);
  settings.syncMute(true);
  assert.equal(createSettings(storage).get().muted, true);
});

test('theme tokens become kebab-case CSS variables, factions included', () => {
  assert.equal(cssName('policeRed'), '--mc-police-red');
  const names = themeVariables().map(([name]) => name);
  assert.ok(names.includes('--mc-gold'));
  assert.ok(names.includes('--mc-ui-tint'));
  assert.ok(names.includes('--mc-faction-salt-dogs'));
  assert.equal(names.filter((n) => n.startsWith('--mc-faction-') && !n.endsWith('-shade')).length, 4);
});
