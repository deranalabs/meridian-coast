// Boot and main loop: builds the game, runs fixed 1/60 s steps, draws, and exposes window.__meridian.
// ?shot=drive|foot|title&seed=N stages a deterministic screenshot scene; &live=1 keeps it running; &hud=0
// hides the HUD.
import * as THREE from '../vendor/three.module.min.js';
import { createRenderer } from './render/renderer.js';
import { createDynamicResolution } from './render/dynamicres.js';
import { getTimeOfDay } from './render/timeofday.js';
import { createGame } from './game.js';
import { createInput } from './core/input.js';
import { createTitleScreen } from './ui/titlescreen.js';
import { getShot } from './shots.js';
import { loadSave, applySave, saveGame } from './save/savesystem.js';
import { createSound } from './audio/sound.js';
import { applyTheme } from './ui/theme.js';
import { createSettings } from './ui/settings.js';
import { createPauseMenu } from './ui/pausemenu.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.1;

const params = new URLSearchParams(window.location.search);
const shot = getShot(params.get('shot'));
const live = params.get('live') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '1', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;
const stored = shot || params.get('fresh') === '1' ? null : loadSave();
const resume = stored?.status === 'ok' ? stored.save : null;
const timeOfDay = getTimeOfDay(shot?.time ?? params.get('time') ?? resume?.time ?? 'dusk');
const showHud = params.get('hud') !== '0' && (shot ? shot.hud !== false : true);

const canvas = document.getElementById('game');
const { renderer, stats, resize } = createRenderer(canvas);
const focus = shot?.focus ? new THREE.Vector3(...shot.focus) : new THREE.Vector3(36, 0, -68);
const game = createGame({ renderer, seed, timeOfDay, focus, showHud });
if (resume) applySave(game, resume);
const input = createInput(canvas);
const dynamicResolution = createDynamicResolution(game.post);
const fixedScale = params.has('scale');
if (fixedScale) game.post.setScale(Number(params.get('scale')) || 1);
for (const name of (params.get('hide') ?? '').split(',').filter(Boolean)) {
  game.scene.traverse((object) => {
    if (object.name === name || object.name.startsWith(`${name}-`)) object.visible = false;
  });
}
const idleInput = { pressed: () => false, down: () => false, axis: () => 0, mouse: { dx: 0, dy: 0 } };

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const size = resize(width, height);
  game.camera.aspect = width / height;
  game.camera.updateProjectionMatrix();
  game.post.setSize(size.width, size.height);
}
window.addEventListener('resize', onResize);
onResize();

window.__meridian = {
  /** The live game, for the automated tests (teleporting, reading wallets and shops). */
  game,
  /** Move Ilo on foot to (x, z), facing `heading`. */
  teleport(x, z, heading = 0) {
    if (game.player.state.mode !== 'foot') return false;
    game.player.placeOnFoot(x, z, heading);
    return true;
  },
  getState() {
    const player = game.player.state;
    return {
      drawCalls: stats.drawCalls,
      triangles: stats.triangles,
      fps: Math.round(stats.fps * 10) / 10,
      frameMs: Math.round(stats.frameMs * 100) / 100,
      renderScale: Math.round(game.post.scale * 100) / 100,
      shot: params.get('shot'),
      mode: player.mode,
      speedKmh: player.vehicle ? Math.round(Math.abs(player.vehicle.speed) * 36) / 10 : 0,
      forwardKmh: player.vehicle ? Math.round(player.vehicle.speed * 36) / 10 : 0,
      time: Math.round(game.time * 100) / 100,
      camera: game.camera.position.toArray().map((v) => Math.round(v * 10) / 10),
      characters: game.characters.characters.length,
      cars: game.fleet.cars.length,
      cash: player.wallet.cash,
      health: Math.round(player.vitals.health),
      stars: game.action.police.wanted.stars,
      policeUnits: game.action.police.units.units.length,
      helicopter: game.action.police.helicopter.state.active,
      weapon: player.arsenal.current,
      shop: game.services.shops.openPlace?.id ?? null,
      respawning: game.services.respawn.active,
      audio: sound.mixer.ctx?.state ?? 'locked',
      muted: sound.mixer.muted,
      volume: sound.mixer.volume,
      paused: pause.isOpen(),
      title: Boolean(document.querySelector('#title:not(.hidden)')),
    };
  },
  /** Triangles per mesh (instances included), largest first: a quick profile of where geometry goes. */
  getMeshBudget() {
    const rows = [];
    game.scene.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;
      const geometry = object.geometry;
      const triangles = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
      const instances = object.isInstancedMesh ? object.count : geometry.instanceCount ?? 1;
      const count = Number.isFinite(instances) ? instances : 1;
      const name = object.name || object.type;
      rows.push({ name, triangles: Math.round(triangles * count), shadow: object.castShadow });
    });
    return rows.sort((a, b) => b.triangles - a.triangles).slice(0, 25);
  },
};

applyTheme();
const settings = createSettings();
const sound = createSound(game, game.action.events, settings.get());
const menuSound = (kind) => sound.sfx.ui(kind);
settings.onChange((s) => {
  sound.mixer.setVolume(s.volume);
  sound.mixer.setMuted(s.muted);
  for (const size of ['small', 'large']) game.hud.root.classList.toggle(`map-${size}`, s.minimap === size);
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyM') settings.syncMute(sound.mixer.muted);
});

/** Saving from the pause menu works anywhere except with the police on Ilo's tail. */
function saveFromMenu() {
  if (game.action.police.wanted.stars > 0) return 'Lose the police before you save.';
  if (game.services.respawn.active) return 'Not now.';
  const ok = saveGame(game);
  game.action.events.emit('saved', { ok });
  return ok ? 'Game saved.' : 'Could not save: this browser blocks storage.';
}

const pause = createPauseMenu({
  settings,
  place: () => game.hud.root.querySelector('.district')?.textContent ?? '',
  onSave: saveFromMenu,
  onQuit: () => window.location.reload(),
  onEvent: menuSound,
});
const canPause = () => !pause.isOpen() && !game.services.shops.openPlace && !game.services.respawn.active;
let pauseRequested = false;
// Chrome swallows the Esc that releases pointer lock, so losing the lock during play also pauses.
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && !shot) pauseRequested = true;
});

function openPause() {
  pause.open();
  sound.setPaused(true);
  if (document.pointerLockElement) document.exitPointerLock?.();
}

function frame(dt) {
  sound.update();
  stats.begin();
  game.draw(game.time);
  stats.end(dt);
  game.updateHud();
}

function runLoop(title) {
  let last = performance.now();
  let accumulator = 0;
  const loop = (now) => {
    const raw = (now - last) / 1000;
    const dt = Math.min(MAX_FRAME, raw);
    last = now;
    if (!fixedScale) dynamicResolution.update(raw * 1000, dt);
    const playing = !title?.isOpen();
    if (playing && canPause() && (input.pressed('Escape') || pauseRequested)) {
      openPause();
      input.endFrame();
    } else if (pause.isOpen()) {
      if (pause.update(input) === 'resume') sound.setPaused(false);
      input.endFrame();
    }
    pauseRequested = false;
    if (pause.isOpen()) {
      accumulator = 0;
      frame(dt);
      requestAnimationFrame(loop);
      return;
    }
    accumulator += dt;
    const controls = playing ? input : idleInput;
    while (accumulator >= STEP) {
      game.step(STEP, controls);
      if (controls === input) input.endFrame();
      accumulator -= STEP;
    }
    if (title?.isOpen()) {
      title.update(input);
      input.endFrame();
    }
    frame(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

if (shot) {
  const scripted = shot.stage(game) ?? {};
  for (let index = 0; index < shot.steps; index += 1) {
    game.step(STEP, scripted.input?.(index) ?? idleInput);
    scripted.afterStep?.(index);
  }
  if (shot.title) createTitleScreen(true, { settings });
  let frames = 0;
  const paint = () => {
    frame(STEP);
    frames += 1;
    if (frames < 3) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      if (live) runLoop(null);
    }
  };
  requestAnimationFrame(paint);
} else {
  const title = createTitleScreen(false, { settings, onEvent: menuSound });
  runLoop(title);
}
