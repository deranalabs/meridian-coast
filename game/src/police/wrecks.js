// Burning wrecks: a rammed police car's engine fire, its smoke plume and the impact flash, in a fixed pool of four.
// One point cloud for every flame, puff and flash (tongues of flame that cover what is behind them, puffs and the
// flash that only add light), and an orange wash on the road; nothing is added or removed after start-up.
import * as THREE from '../../vendor/three.module.min.js';
import { WRECK_SLOTS, burnTime, fireLevel, flicker, flashLevel, pickSlot } from './burnrule.js';

// Six tongues of flame and four puffs: the same eleven points a slot, weighted toward the fire the eye should find.
const FLAMES = 6;
const PUFFS = 4;
const PER_SLOT = FLAMES + PUFFS + 1;
/** Metres from the car's centre to its engine bay, along its heading. */
const BAY = 1.35;

const VERTEX = /* glsl */ `
uniform float uHalfHeight;
attribute vec3 aColour;
attribute float aSize;
attribute float aTongue;
varying vec3 vColour;
varying float vTongue;
void main() {
  vColour = aColour;
  vTongue = aTongue;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  // Sizes are in metres across: half the canvas height over tan(half the fov) turns them into pixels.
  gl_PointSize = aSize * projectionMatrix[1][1] * uHalfHeight / max(-view.z, 0.5);
  gl_Position = projectionMatrix * view;
}`;

// A puff or the flash is a soft round blot. A flame (vTongue 1) is a tongue: narrow, pointed at the top, round at
// the foot, with a firmer edge so the tongues stand apart instead of melting into one glow.
const FRAGMENT = /* glsl */ `
varying vec3 vColour;
varying float vTongue;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float up = 0.5 - gl_PointCoord.y;
  p.x *= 1.0 + vTongue * (1.1 + 2.2 * max(up, 0.0));
  p.y += vTongue * 0.12;
  float r = length(p) * 2.0;
  float soft = 1.0 - smoothstep(mix(0.15, 0.45, vTongue), 1.0, r);
  if (soft <= 0.0) discard;
  // Premultiplied: a puff (alpha 0) only adds light, a tongue also covers most of what is behind it, so a flame in
  // front of a bright dusk sky keeps its own orange instead of summing with the sky to a pale yellow.
  gl_FragColor = vec4(vColour * soft * soft, vTongue * 0.8 * soft * soft);
}`;

const FIRE = new THREE.Color('#ff7a1e');
// Almost no blue and little green, so that even where tongues overlap and the sum clips the fire stays yellow at
// its heart and orange at its edges instead of burning out to a pale white.
const CORE = [1.0, 0.42, 0.03];
const EMBER = [1.0, 0.17, 0.0];
const FLASH = [1.0, 0.78, 0.4];
const SMOKE = [0.2, 0.09, 0.04];
/** Additive light has to outshine a lit road and stay orange: the flames run hot, the smoke only a faint warm haze. */
const FLAME_GAIN = 1.5;
const SMOKE_GAIN = 0.8;
const canvasSize = new THREE.Vector2();

/** ignite(car, x, z, speed) sets a car alight; update(dt, time) moves the fires; light(beacons, time) washes. */
export function createWrecks() {
  const count = WRECK_SLOTS * PER_SLOT;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  // Fixed from the start: the first FLAMES points of every slot are tongues, the puffs and the flash are not.
  const tongues = new Float32Array(count).map((_, i) => (i % PER_SLOT < FLAMES ? 1 : 0));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('aTongue', new THREE.BufferAttribute(tongues, 1));
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aColour', new THREE.BufferAttribute(colours, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  const halfHeight = { value: 400 };
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({ uniforms: { uHalfHeight: halfHeight },
    vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, fog: false }));
  points.frustumCulled = false;
  points.renderOrder = 7;
  points.name = 'wreck-fires';
  points.visible = false;
  points.onBeforeRender = (renderer) => {
    halfHeight.value = renderer.getDrawingBufferSize(canvasSize).y / 2;
  };
  const slots = Array.from({ length: WRECK_SLOTS }, (_, i) => ({ car: null, age: Infinity, life: 0, seed: i * 1.7,
    x: 0, y: 0, z: 0, flash: Infinity, fx: 0, fy: 0, fz: 0 }));

  function put(index, x, y, z, colour, scale, size) {
    positions.set([x, y, z], index * 3);
    colours.set([colour[0] * scale, colour[1] * scale, colour[2] * scale], index * 3);
    sizes[index] = scale > 0 ? size : 0;
  }

  function follow(slot) {
    const { car } = slot;
    if (!car) return;
    if (car.visible === false || car.spare) {
      // A car taken back into the fleet takes its fire with it: put it out quickly where it was last seen.
      slot.car = null;
      slot.life = Math.min(slot.life, slot.age + 1.2);
      return;
    }
    slot.x = car.position.x + Math.sin(car.heading) * BAY;
    slot.y = car.position.y;
    slot.z = car.position.z + Math.cos(car.heading) * BAY;
  }

  return {
    points,
    slots,
    /** A ram at `speed` m/s on `car` at (x, z): the flash there, and the car's engine catching. */
    ignite(car, x, z, speed) {
      let slot = slots.find((s) => s.car === car && s.age < s.life);
      if (slot) slot.life = Math.max(slot.life, slot.age + burnTime(speed));
      else {
        slot = slots[pickSlot(slots)];
        Object.assign(slot, { car, age: 0, life: burnTime(speed) });
      }
      Object.assign(slot, { flash: 0, fx: x, fy: car.position.y + 0.8, fz: z });
      follow(slot);
    },
    /** How many wrecks are burning now. */
    burning() {
      return slots.filter((s) => s.age < s.life).length;
    },
    update(dt, time) {
      let any = false;
      slots.forEach((slot, s) => {
        slot.age += dt;
        slot.flash += dt;
        follow(slot);
        if (slot.age >= slot.life) slot.car = null;
        const level = fireLevel(slot.age, slot.life);
        const base = s * PER_SLOT;
        for (let k = 0; k < FLAMES; k += 1) {
          const lick = flicker(time + k * 0.37, slot.seed + k);
          const rise = ((time * 1.9 + k / FLAMES) % 1);
          // Spread across the bay and the roof, the tongues lick up to about 5 m, widest and hottest at the base.
          const spread = (k - (FLAMES - 1) / 2) * 0.42;
          put(base + k, slot.x + spread * Math.cos(slot.seed), slot.y + 0.9 + rise * 4.1 * level,
            slot.z + spread * Math.sin(slot.seed), k % 2 ? EMBER : CORE, FLAME_GAIN * level * lick * (1 - rise * 0.45),
            (5.6 - rise * 2.6) * (0.6 + level * 0.4));
        }
        for (let k = 0; k < PUFFS; k += 1) {
          const phase = (time * 0.32 + k / PUFFS + slot.seed) % 1;
          put(base + FLAMES + k, slot.x + phase * 2 + Math.sin(time * 0.8 + k) * 0.5, slot.y + 4.2 + phase * 8,
            slot.z - phase * 1.2, SMOKE, SMOKE_GAIN * level * (1 - phase * 0.85), 3.2 + phase * 5);
        }
        const flash = flashLevel(slot.flash);
        put(base + PER_SLOT - 1, slot.fx, slot.fy, slot.fz, FLASH, flash * 1.8, 4.5 + (1 - flash) * 3);
        any = any || level > 0 || flash > 0;
      });
      points.visible = any;
      if (!any) return;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aColour.needsUpdate = true;
      geometry.attributes.aSize.needsUpdate = true;
    },
    /** The fire's orange light on the road under each burning wreck and the flash's wider burst. */
    light(beacons, time, level) {
      for (const slot of slots) {
        const fire = fireLevel(slot.age, slot.life) * flicker(time, slot.seed);
        if (fire > 0) beacons.wash(slot.x, slot.y, slot.z, FIRE, 2.1 * fire * Math.max(0.7, level), 8);
        const flash = flashLevel(slot.flash);
        if (flash > 0) beacons.wash(slot.fx, slot.fy - 0.8, slot.fz, FIRE, 2.4 * flash, 11);
      }
    },
    /** Put every fire out at once (a new scene or a cleared state). */
    clear() {
      for (const slot of slots) Object.assign(slot, { car: null, age: Infinity, life: 0, flash: Infinity });
      points.visible = false;
    },
  };
}
