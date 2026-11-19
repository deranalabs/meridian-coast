// Neon signs and billboards: a painted neon word atlas drawn as additive HDR quads, and lit ad billboards.
import * as THREE from '../../vendor/three.module.min.js';
import { MeshBuilder } from '../core/meshbuilder.js';
import { makeCanvas, toTexture } from '../render/textures.js';
import { createRandom } from '../core/random.js';

/** Blade signs stick out from the wall at a fixed size; the props module gives them a matching box. */
export const BLADE_WIDTH = 2.4;
const SLOT_W = 512;
const SLOT_H = 96;
const COLUMNS = 2;
const ROWS = 10;

/** Original shop words, each with its tube colour and a font. */
const WORDS = [
  ['LIQUOR', '#ff3d7f', 'sans'], ['MOTEL', '#3fe0ff', 'script'], ['OPEN 24', '#ff5050', 'sans'],
  ['TACOS', '#ffb347', 'script'], ['PELICAN', '#ff6fd8', 'script'], ['SOLARA', '#c45cff', 'sans'],
  ['BAR', '#3fe0ff', 'sans'], ['HOTEL CORAL', '#ff7fae', 'sans'], ['DINER', '#ff3d3d', 'script'],
  ['KARAOKE', '#b4ff5a', 'sans'], ['PAWN', '#ffd34a', 'sans'], ['CLUB VELOUR', '#c45cff', 'script'],
  ['NOODLES', '#ff6a3d', 'sans'], ['ARCADE', '#3fa8ff', 'sans'], ['TATTOO', '#ff4fa0', 'script'],
  ['SURF', '#3fe0d0', 'script'], ['LAUNDRY', '#9ad8ff', 'sans'], ['PHARMACY', '#5aff9a', 'sans'],
  ['PIZZA', '#ff8a3d', 'script'], ['THE TIDE', '#3fe0ff', 'script'],
];

const FONTS = {
  sans: '800 66px "Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
  script: 'italic 700 64px "Snell Roundhand", "Brush Script MT", "Segoe Script", cursive',
};

function neonAtlas() {
  const { canvas, ctx } = makeCanvas(SLOT_W * COLUMNS, SLOT_H * ROWS);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const slots = WORDS.map(([word, colour, font], index) => {
    const sx = (index % COLUMNS) * SLOT_W;
    const sy = Math.floor(index / COLUMNS) * SLOT_H;
    ctx.font = FONTS[font];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = Math.min(SLOT_W - 40, ctx.measureText(word).width);
    const cx = sx + SLOT_W / 2;
    const cy = sy + SLOT_H / 2 + 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, SLOT_W, SLOT_H);
    ctx.clip();
    ctx.shadowColor = colour;
    ctx.shadowBlur = 22;
    ctx.fillStyle = colour;
    ctx.fillText(word, cx, cy, SLOT_W - 40);
    ctx.shadowBlur = 8;
    ctx.fillText(word, cx, cy, SLOT_W - 40);
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.strokeText(word, cx, cy, SLOT_W - 40);
    ctx.globalAlpha = 1;
    ctx.restore();
    const w = (width + 36) / (SLOT_W * COLUMNS);
    const u0 = (sx + SLOT_W / 2) / (SLOT_W * COLUMNS) - w / 2;
    const v1 = 1 - sy / (SLOT_H * ROWS);
    const v0 = 1 - (sy + SLOT_H) / (SLOT_H * ROWS);
    return { u0, u1: u0 + w, v0, v1, aspect: (width + 36) / SLOT_H };
  });
  return { texture: toTexture(canvas, { colour: true, repeat: false }), slots };
}

const ADS = [
  { title: 'SALTBREEZE', line: 'cola  ·  taste the coast', bg: ['#ff5fa2', '#ffb347'], fg: '#ffffff' },
  { title: 'JUNO KESTREL GT', line: 'built for the long night', bg: ['#141a2e', '#3a2a6a'], fg: '#ffd166' },
  { title: 'CORAL 98.1', line: 'the sound of Port Meridian', bg: ['#2ec4c9', '#1f3d7a'], fg: '#ffffff' },
  { title: 'MANGO TAXI', line: 'call 555-0199', bg: ['#ffd166', '#ff8a3d'], fg: '#1b1b1b' },
  { title: 'MARLIN CROWN', line: 'casino  ·  hotel  ·  rooftop', bg: ['#1c1030', '#7a2a6a'], fg: '#ffd27a' },
  { title: 'PALMETTO PIER', line: 'rides open till 2am', bg: ['#3fe0d0', '#ff7fae'], fg: '#ffffff' },
  { title: 'GULL KEY LIGHT', line: 'tours at sunset', bg: ['#ff9468', '#6a3c8c'], fg: '#ffffff' },
  { title: 'NIGHTJAR ENERGY', line: 'stay up. stay out.', bg: ['#0e0e12', '#2a4a1a'], fg: '#b4ff5a' },
];

function adAtlas() {
  const w = 512;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w * 2, h * 4);
  ADS.forEach((ad, index) => {
    const x = (index % 2) * w;
    const y = Math.floor(index / 2) * h;
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, ad.bg[0]);
    gradient.addColorStop(1, ad.bg[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k += 1) {
      ctx.beginPath();
      ctx.arc(x + w * 0.82, y + h * 0.45, 30 + k * 26, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = ad.fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '900 54px "Avenir Next Condensed", "Arial Narrow", Arial, sans-serif';
    ctx.fillText(ad.title, x + 26, y + 120, w - 60);
    ctx.font = 'italic 600 26px "Avenir Next", Arial, sans-serif';
    ctx.fillText(ad.line, x + 28, y + 168, w - 60);
    ctx.fillRect(x + 28, y + 186, 120, 6);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 8;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  });
  return toTexture(canvas, { colour: true, repeat: false });
}

const NEON_VERTEX = /* glsl */ `
attribute float aPhase;
uniform float uTime;
varying vec2 vUv;
varying float vFade;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  float d = distance(world.xyz, cameraPosition);
  float flicker = step(0.985, fract(sin(floor(uTime * 9.0 + aPhase * 50.0) * 12.9898) * 43758.5453));
  vFade = (1.0 - smoothstep(160.0, 520.0, d)) * (1.0 - flicker * 0.7);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const NEON_FRAGMENT = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uLevel;
varying vec2 vUv;
varying float vFade;
void main() {
  vec3 neon = texture2D(uAtlas, vUv).rgb;
  neon = neon * neon * 1.4 + neon * 0.4;
  gl_FragColor = vec4(neon * uLevel * vFade, 1.0);
}`;

function signQuad(builder, slot, centre, rot, height, phase, offset = 0, fixedWidth = 0) {
  const width = fixedWidth || height * slot.aspect;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const right = [c, 0, -s];
  const normal = [s, 0, c];
  const p = [centre[0] + normal[0] * offset, centre[1], centre[2] + normal[2] * offset];
  const hw = width / 2;
  const hh = height / 2;
  const corner = (u, v) => [p[0] + right[0] * u, p[1] + v, p[2] + right[2] * u];
  builder.quad(
    [corner(-hw, -hh), corner(hw, -hh), corner(hw, hh), corner(-hw, hh)],
    normal,
    [[slot.u0, slot.v0], [slot.u1, slot.v0], [slot.u1, slot.v1], [slot.u0, slot.v1]],
    { aPhase: phase },
  );
}

/** Neon words for every sign spot and lit billboards on chosen roofs; update(time) drives flicker. */
export function createSigns(buildings, timeOfDay, seed) {
  const random = createRandom(seed * 53 + 3);
  const atlas = neonAtlas();
  const builder = new MeshBuilder({ position: 3, normal: 3, uv: 2, aPhase: 1 });
  for (const sign of buildings.signs) {
    const slot = random.pick(atlas.slots);
    const phase = random.next();
    if (sign.kind === 'flat') {
      const height = Math.min(1.9, (sign.width + 0.6) / slot.aspect);
      signQuad(builder, slot, [sign.x, sign.y, sign.z], sign.rot, height, phase, 0.02);
    } else if (sign.kind === 'blade') {
      signQuad(builder, slot, [sign.x, sign.y, sign.z], sign.rot, 1.1, phase, 0.09, BLADE_WIDTH);
      signQuad(builder, slot, [sign.x, sign.y, sign.z], sign.rot + Math.PI, 1.1, phase, 0.09, BLADE_WIDTH);
    } else {
      const height = Math.min(3.2, sign.width / slot.aspect);
      signQuad(builder, slot, [sign.x, sign.y + height / 2, sign.z], sign.rot, height, phase, 0);
      signQuad(builder, slot, [sign.x, sign.y + height / 2, sign.z], sign.rot + Math.PI, height, phase, 0.05);
    }
  }
  const uniforms = {
    uAtlas: { value: atlas.texture },
    uLevel: { value: 3.4 * timeOfDay.neonLevel },
    uTime: { value: 0 },
  };
  const neonMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: NEON_VERTEX,
    fragmentShader: NEON_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  const neon = new THREE.Mesh(builder.build(), neonMaterial);
  neon.name = 'neon-signs';
  neon.renderOrder = 4;

  const billboards = [];
  const boards = new MeshBuilder({ position: 3, normal: 3, uv: 2 });
  for (const roof of buildings.roofs) {
    if (roof.kind !== 'flat' || !roof.fronts?.length || roof.district === 'heights') continue;
    if (roof.x1 - roof.x0 < 10 || roof.z1 - roof.z0 < 10 || !random.chance(0.22)) continue;
    const front = roof.fronts[0];
    const rot = { n: Math.PI, s: 0, e: Math.PI / 2, w: -Math.PI / 2 }[front];
    const cx = front === 'e' ? roof.x1 - 1 : front === 'w' ? roof.x0 + 1 : (roof.x0 + roof.x1) / 2;
    const cz = front === 's' ? roof.z1 - 1 : front === 'n' ? roof.z0 + 1 : (roof.z0 + roof.z1) / 2;
    const y = roof.y + 4.6;
    billboards.push({ x: cx, y, z: cz, rot });
    const ad = random.int(0, ADS.length - 1);
    const u0 = (ad % 2) / 2;
    const v1 = 1 - Math.floor(ad / 2) / 4;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const corner = (u, v) => [cx + c * u + s * 0.02, y + v, cz - s * u + c * 0.02];
    boards.quad([corner(-4, -2), corner(4, -2), corner(4, 2), corner(-4, 2)], [s, 0, c],
      [[u0, v1 - 0.25], [u0 + 0.5, v1 - 0.25], [u0 + 0.5, v1], [u0, v1]]);
  }
  const adTexture = adAtlas();
  const boardMaterial = new THREE.MeshStandardMaterial({
    map: adTexture,
    emissiveMap: adTexture,
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: timeOfDay.name === 'night' ? 1.3 : 0.75,
    roughness: 0.55,
  });
  const boardMesh = new THREE.Mesh(boards.build(), boardMaterial);
  boardMesh.name = 'billboards';
  boardMesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(neon, boardMesh);
  return {
    group,
    billboards,
    update(time) {
      uniforms.uTime.value = time;
    },
  };
}
