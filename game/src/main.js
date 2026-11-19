// Boot and main loop: builds renderer, world and actors, runs fixed-step updates and exposes debug state.
import * as THREE from '../vendor/three.module.min.js';
import { createRenderer } from './render/renderer.js';
import { createPost } from './render/post.js';
import { createSky } from './render/sky.js';
import { createEnvironment } from './render/environment.js';
import { createLighting } from './render/lighting.js';
import { installFog } from './render/fog.js';
import { getTimeOfDay } from './render/timeofday.js';
import { createCity } from './world/city.js';
import { getShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.1;

const params = new URLSearchParams(window.location.search);
const shot = getShot(params.get('shot'));
const seedParam = Number.parseInt(params.get('seed') ?? '1', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;
const timeOfDay = getTimeOfDay(shot?.time ?? params.get('time') ?? 'dusk');

const canvas = document.getElementById('game');
const { renderer, stats, resize } = createRenderer(canvas);
const scene = new THREE.Scene();
scene.fog = installFog(timeOfDay);
scene.environment = createEnvironment(renderer, timeOfDay);
scene.environmentIntensity = timeOfDay.envIntensity;

const sky = createSky(timeOfDay);
scene.add(sky.mesh);
const lighting = createLighting(scene, timeOfDay);
const city = createCity(seed, timeOfDay);
scene.add(city.group);

const camera = new THREE.PerspectiveCamera(58, 16 / 10, 0.1, 2600);
const post = createPost(renderer, timeOfDay);
const game = { scene, camera, city, lighting, timeOfDay, seed, time: 0 };

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const size = resize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  post.setSize(size.width, size.height);
}
window.addEventListener('resize', onResize);
onResize();

function step(dt) {
  game.time += dt;
  city.update(game.time);
}

function draw(dt) {
  stats.begin();
  const focus = new THREE.Vector3();
  camera.getWorldDirection(focus).multiplyScalar(30).add(camera.position);
  lighting.follow(focus);
  sky.update(camera, game.time);
  post.render(scene, camera, game.time);
  stats.end(dt);
}

window.__meridian = {
  getState() {
    return {
      drawCalls: stats.drawCalls,
      triangles: stats.triangles,
      fps: Math.round(stats.fps * 10) / 10,
      frameMs: Math.round(stats.frameMs * 100) / 100,
      shot: params.get('shot'),
      time: game.time,
      camera: camera.position.toArray().map((v) => Math.round(v * 10) / 10),
    };
  },
};

if (shot) {
  shot.stage(game);
  for (let index = 0; index < shot.steps; index += 1) step(STEP);
  let frames = 0;
  const paint = () => {
    draw(STEP);
    frames += 1;
    if (frames < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  camera.position.set(60, 3.2, -55);
  camera.lookAt(-40, 6, -62);
  let last = performance.now();
  let accumulator = 0;
  const loop = (now) => {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += dt;
    while (accumulator >= STEP) {
      step(STEP);
      accumulator -= STEP;
    }
    draw(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
