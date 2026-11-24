// Burning wrecks: a rammed police car's engine fire, its smoke plume and the impact flash, in a fixed pool of four.
// One additive point cloud for every flame, puff and flash, and an orange wash on the road; nothing is added or
// removed after start-up.
import * as THREE from '../../vendor/three.module.min.js';
import { WRECK_SLOTS, burnTime, fireLevel, flicker, flashLevel, pickSlot } from './burnrule.js';

const FLAMES = 4;
const PUFFS = 6;
const PER_SLOT = FLAMES + PUFFS + 1;
/** Metres from the car's centre to its engine bay, along its heading. */
const BAY = 1.35;

const VERTEX = /* glsl */ `
uniform float uHalfHeight;
attribute vec3 aColour;
attribute float aSize;
varying vec3 vColour;
void main() {
  vColour = aColour;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  // Sizes are in metres across: half the canvas height over tan(half the fov) turns them into pixels.
  gl_PointSize = aSize * projectionMatrix[1][1] * uHalfHeight / max(-view.z, 0.5);
  gl_Position = projectionMatrix * view;
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vColour;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float soft = 1.0 - smoothstep(0.15, 1.0, r);
  if (soft <= 0.0) discard;
  gl_FragColor = vec4(vColour * soft * soft, 1.0);
}`;

const FIRE = new THREE.Color('#ff7a1e');
const CORE = [1.0, 0.8, 0.4];
const EMBER = [1.0, 0.38, 0.08];
const SMOKE = [0.3, 0.25, 0.22];
/** Additive light has to outshine a sunlit road: the flames burn past white at their core, the smoke stays a haze. */
const FLAME_GAIN = 3.2;
const SMOKE_GAIN = 1.5;
const canvasSize = new THREE.Vector2();

/** ignite(car, x, z, speed) sets a car alight; update(dt, time) moves the fires; light(beacons, time) washes. */
export function createWrecks() {
  const count = WRECK_SLOTS * PER_SLOT;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aColour', new THREE.BufferAttribute(colours, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  const halfHeight = { value: 400 };
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({ uniforms: { uHalfHeight: halfHeight },
    vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false }));
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
          const spread = (k - 1.5) * 0.34;
          put(base + k, slot.x + spread * Math.cos(slot.seed), slot.y + 1.0 + rise * 2.3 * level,
            slot.z + spread * Math.sin(slot.seed), k % 2 ? EMBER : CORE, FLAME_GAIN * level * lick * (1 - rise * 0.55),
            (3.1 - rise * 1.3) * (0.6 + level * 0.4));
        }
        for (let k = 0; k < PUFFS; k += 1) {
          const phase = (time * 0.32 + k / PUFFS + slot.seed) % 1;
          put(base + FLAMES + k, slot.x + phase * 1.6 + Math.sin(time * 0.8 + k) * 0.4, slot.y + 1.9 + phase * 7,
            slot.z - phase * 0.9, SMOKE, SMOKE_GAIN * level * (1 - phase * 0.8), 2.6 + phase * 4.4);
        }
        const flash = flashLevel(slot.flash);
        put(base + PER_SLOT - 1, slot.fx, slot.fy, slot.fz, CORE, flash * 1.6, 4.5 + (1 - flash) * 3);
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
        if (fire > 0) beacons.wash(slot.x, slot.y, slot.z, FIRE, 1.6 * fire * Math.max(0.7, level), 6.5);
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
