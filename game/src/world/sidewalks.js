// Sidewalk slabs: each block's raised paved top following the terrain, with kerb faces and kerb-stone edges.
import * as THREE from '../../vendor/three.module.min.js';
import { MeshBuilder } from '../core/meshbuilder.js';
import { heightAt } from './heightfield.js';
import { PAVER_CELL } from './surfaces.js';
import { polygonArea, polygonCentroid } from './geometry2d.js';
import { UNITS } from '../palette.js';

const KERB = UNITS.kerbHeight;
const EDGE_STEP = 6;
const KERB_STONE = 0.32;
const PAVER_METRES = 2.4;

function subdivide(polygon) {
  const points = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / EDGE_STEP));
    for (let s = 0; s < steps; s += 1) {
      points.push({ x: a.x + ((b.x - a.x) * s) / steps, z: a.z + ((b.z - a.z) * s) / steps });
    }
  }
  return points;
}

function pushTop(builder, polygon, cell) {
  const ring = subdivide(polygon);
  const centre = polygonCentroid(polygon);
  const ccw = polygonArea(polygon) > 0;
  const toVertex = (p, inward) => builder.vertex({
    position: [p.x, heightAt(p.x, p.z) + KERB + (inward ? 0.002 : 0), p.z],
    normal: [0, 1, 0],
    aPaverUv: [p.x / PAVER_METRES, p.z / PAVER_METRES],
    aCell: cell,
  });
  const middle = [];
  for (const p of ring) middle.push({ x: centre.x + (p.x - centre.x) * 0.5, z: centre.z + (p.z - centre.z) * 0.5 });
  const outerIds = ring.map((p) => toVertex(p, false));
  const middleIds = middle.map((p) => toVertex(p, true));
  const centreId = toVertex(centre, true);
  for (let index = 0; index < ring.length; index += 1) {
    const next = (index + 1) % ring.length;
    const quad = [outerIds[index], outerIds[next], middleIds[next], middleIds[index]];
    if (ccw) {
      builder.triangle(quad[0], quad[2], quad[1]);
      builder.triangle(quad[0], quad[3], quad[2]);
      builder.triangle(middleIds[index], centreId, middleIds[next]);
    } else {
      builder.triangle(quad[0], quad[1], quad[2]);
      builder.triangle(quad[0], quad[2], quad[3]);
      builder.triangle(middleIds[index], middleIds[next], centreId);
    }
  }
}

function pushKerbs(builder, polygon) {
  const ring = subdivide(polygon);
  const sign = polygonArea(polygon) > 0 ? 1 : -1;
  const stone = PAVER_CELL.harbor;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 0.01) continue;
    const nx = ((b.z - a.z) / length) * sign;
    const nz = (-(b.x - a.x) / length) * sign;
    const ha = heightAt(a.x, a.z);
    const hb = heightAt(b.x, b.z);
    const along = Math.hypot(a.x, a.z) / 1.2;
    const span = length / 1.2;
    const face = sign > 0 ? [b, a] : [a, b];
    const hf = sign > 0 ? [hb, ha] : [ha, hb];
    builder.quad(
      [
        [face[0].x, hf[0] - 0.6, face[0].z], [face[1].x, hf[1] - 0.6, face[1].z],
        [face[1].x, hf[1] + KERB, face[1].z], [face[0].x, hf[0] + KERB, face[0].z],
      ],
      [nx, 0, nz],
      [[along, 0.02], [along + span, 0.02], [along + span, 0.2], [along, 0.2]],
      { aCell: stone },
    );
    const ia = { x: a.x - nx * KERB_STONE, z: a.z - nz * KERB_STONE };
    const ib = { x: b.x - nx * KERB_STONE, z: b.z - nz * KERB_STONE };
    const top = sign > 0
      ? [[ia.x, ha, ia.z], [ib.x, hb, ib.z], [b.x, hb, b.z], [a.x, ha, a.z]]
      : [[a.x, ha, a.z], [b.x, hb, b.z], [ib.x, hb, ib.z], [ia.x, ha, ia.z]];
    for (const corner of top) corner[1] += KERB + 0.006;
    builder.quad(top, [0, 1, 0], [[along, 0.05], [along + span, 0.05], [along + span, 0.4], [along, 0.4]],
      { aCell: stone });
  }
}

const VERTEX_PARS = /* glsl */ `
attribute vec2 aPaverUv;
attribute vec2 aCell;
varying vec2 vPaverUv;
varying vec2 vCell;
varying vec3 vPaverWorld;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler2D uPavers;
uniform sampler2D uGroundData;
uniform float uWetness;
#ifdef WET_RAIN
uniform float uRain;
#endif
varying vec2 vPaverUv;
varying vec2 vCell;
varying vec3 vPaverWorld;
`;

const MAP_FRAGMENT = /* glsl */ `
  vec2 paverLocal = fract(vPaverUv);
  vec2 paverUv = (vCell + 0.01 + paverLocal * 0.98) * 0.5;
  vec2 paverGx = dFdx(vPaverUv) * 0.49;
  vec2 paverGy = dFdy(vPaverUv) * 0.49;
  vec3 paverColour = textureGrad(uPavers, paverUv, paverGx, paverGy).rgb;
  vec4 paverData = texture2D(uGroundData, vPaverWorld.xz / 30.0);
  float paverWet = smoothstep(0.45, 0.62, paverData.r) * uWetness;
#ifdef WET_RAIN
  paverWet = max(paverWet, uRain * (0.75 + 0.25 * smoothstep(0.4, 0.55, paverData.r)));
#endif
  paverColour *= (0.82 + paverData.b * 0.36) * (1.0 - paverWet * 0.3);
  diffuseColor.rgb *= paverColour;
`;

const ROUGHNESS_FRAGMENT = /* glsl */ `
  float roughnessFactor = mix(0.86, 0.3, paverWet);
`;

/** One merged mesh of all sidewalk slabs and kerbs. */
export function createSidewalks(layout, textures, timeOfDay) {
  const builder = new MeshBuilder({ position: 3, normal: 3, aPaverUv: 2, aCell: 2 }, {}, 'aPaverUv');
  for (const block of layout.blocks) {
    const cell = PAVER_CELL[block.district] ?? PAVER_CELL.harbor;
    pushTop(builder, block.polygon, cell);
    pushKerbs(builder, block.polygon);
  }
  const geometry = builder.build();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const uniforms = {
    uPavers: { value: textures.pavers },
    uGroundData: { value: textures.data },
    uWetness: { value: timeOfDay.wetness ?? (timeOfDay.name === 'night' ? 0.8 : 0.6) },
    uRain: { value: 0 },
  };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vPaverUv = aPaverUv;
  vCell = aCell;
  vPaverWorld = (modelMatrix * vec4(position, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', ROUGHNESS_FRAGMENT);
  };
  material.customProgramCacheKey = () => 'pavers-v1';
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'sidewalks';
  mesh.receiveShadow = true;
  return mesh;
}
