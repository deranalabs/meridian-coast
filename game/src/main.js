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

const STEP = 1 / 60;
const MAX_FRAME = 0.1;

const params = new URLSearchParams(window.location.search);
const shot = getShot(params.get('shot'));
const live = params.get('live') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '1', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;
const timeOfDay = getTimeOfDay(shot?.time ?? params.get('time') ?? 'dusk');
const showHud = params.get('hud') !== '0' && (shot ? shot.hud !== false : true);

const canvas = document.getElementById('game');
const { renderer, stats, resize } = createRenderer(canvas);
const focus = shot?.focus ? new THREE.Vector3(...shot.focus) : new THREE.Vector3(36, 0, -68);
const game = createGame({ renderer, seed, timeOfDay, focus, showHud });
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
      time: Math.round(game.time * 100) / 100,
      camera: game.camera.position.toArray().map((v) => Math.round(v * 10) / 10),
      characters: game.characters.characters.length,
      cars: game.fleet.cars.length,
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
      rows.push({ name: object.name || object.type, triangles: Math.round(triangles * count), shadow: object.castShadow });
    });
    return rows.sort((a, b) => b.triangles - a.triangles).slice(0, 25);
  },
};

function frame(dt) {
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
    accumulator += dt;
    const controls = title?.isOpen() ? idleInput : input;
    while (accumulator >= STEP) {
      game.step(STEP, controls);
      if (controls === input) input.endFrame();
      accumulator -= STEP;
    }
    if (title?.isOpen() && input.pressed('Enter')) title.close();
    if (title?.isOpen()) input.endFrame();
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
  if (shot.title) createTitleScreen(true);
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
  const title = createTitleScreen(false);
  runLoop(title);
}
