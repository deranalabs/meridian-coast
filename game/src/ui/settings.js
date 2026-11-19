// Player settings: master volume, mute and minimap size, kept in local storage apart from the save game.
import { clampVolume } from '../audio/mixer.js';

export const SETTINGS_KEY = 'meridian-coast.settings';
export const MINIMAP_SIZES = Object.freeze(['small', 'normal', 'large']);
export const DEFAULT_SETTINGS = Object.freeze({ volume: 0.8, muted: false, minimap: 'normal' });

/** Any stored object to valid settings; unknown or broken fields take the defaults. */
export function normaliseSettings(input) {
  const raw = input && typeof input === 'object' ? input : {};
  return {
    volume: Math.round(clampVolume(raw.volume, DEFAULT_SETTINGS.volume) * 10) / 10,
    muted: raw.muted === true,
    minimap: MINIMAP_SIZES.includes(raw.minimap) ? raw.minimap : DEFAULT_SETTINGS.minimap,
  };
}

/** Steps a setting by one notch (volume by 10 %, minimap through its sizes, mute flips). */
export function stepSetting(settings, key, direction) {
  const next = { ...settings };
  if (key === 'volume') next.volume = Math.round(clampVolume(settings.volume + direction * 0.1) * 10) / 10;
  else if (key === 'muted') next.muted = !settings.muted;
  else if (key === 'minimap') {
    const index = MINIMAP_SIZES.indexOf(settings.minimap) + Math.sign(direction || 1);
    next.minimap = MINIMAP_SIZES[Math.min(MINIMAP_SIZES.length - 1, Math.max(0, index))];
  }
  return normaliseSettings(next);
}

export function loadSettings(storage = globalThis.localStorage) {
  try {
    return normaliseSettings(JSON.parse(storage?.getItem(SETTINGS_KEY) ?? 'null'));
  } catch {
    return normaliseSettings(null);
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(normaliseSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/**
 * The live settings: get(), change(key, direction) and set(settings) save and call every listener;
 * the mixer's own mute key (M) is mirrored back with syncMute(muted).
 */
export function createSettings(storage = globalThis.localStorage) {
  let current = loadSettings(storage);
  const listeners = [];
  const publish = () => {
    saveSettings(current, storage);
    for (const fn of listeners) fn(current);
  };
  return {
    get: () => current,
    onChange(fn) {
      listeners.push(fn);
      fn(current);
    },
    change(key, direction = 1) {
      current = stepSetting(current, key, direction);
      publish();
      return current;
    },
    set(settings) {
      current = normaliseSettings(settings);
      publish();
    },
    syncMute(muted) {
      if (current.muted === muted) return;
      current = { ...current, muted };
      saveSettings(current, storage);
    },
  };
}
