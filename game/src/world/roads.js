// Road surfaces and paint: lane lines, double yellows, crosswalks, stop lines, manholes and road ribbons.
import * as THREE from '../../vendor/three.module.min.js';
import { MeshBuilder } from '../core/meshbuilder.js';
import { makeCanvas, tileableNoise, toTexture, clamp255 } from '../render/textures.js';
import { heightAt, deckHeight, CAUSEWAY } from './heightfield.js';
import { createRandom } from '../core/random.js';

const CELLS = 4;
const CELL = 64;
const MARK = { white: [0, 0], yellow: [1, 0], zebra: [2, 0], manhole: [0, 1], grate: [1, 1], arrow: [2, 1] };
const PIECE = 7;

function markingAtlas(seed) {
  const size = CELLS * CELL;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);
  const paint = (cell, draw) => {
    ctx.save();
    ctx.translate(cell[0] * CELL, cell[1] * CELL);
    draw(ctx);
    ctx.restore();
  };
  paint(MARK.white, (c) => { c.fillStyle = '#f2f0ea'; c.fillRect(2, 2, CELL - 4, CELL - 4); });
  paint(MARK.yellow, (c) => { c.fillStyle = '#f2c230'; c.fillRect(2, 2, CELL - 4, CELL - 4); });
  paint(MARK.zebra, (c) => { c.fillStyle = '#f4f2ec'; c.fillRect(2, 2, CELL - 4, CELL - 4); });
  paint(MARK.manhole, (c) => {
    c.fillStyle = '#2a2826';
    c.beginPath();
    c.arc(CELL / 2, CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#55524c';
    c.lineWidth = 3;
    c.stroke();
    c.strokeStyle = '#46433e';
    c.lineWidth = 2;
    for (let r = 8; r < CELL / 2 - 6; r += 6) {
      c.beginPath();
      c.arc(CELL / 2, CELL / 2, r, 0, Math.PI * 2);
      c.stroke();
    }
  });
  paint(MARK.grate, (c) => {
    c.fillStyle = '#1e1d1c';
    c.fillRect(4, 18, CELL - 8, CELL - 36);
    c.fillStyle = '#4a4740';
    for (let x = 8; x < CELL - 8; x += 6) c.fillRect(x, 20, 2, CELL - 40);
  });
  paint(MARK.arrow, (c) => {
    c.fillStyle = '#f2f0ea';
    c.fillRect(CELL / 2 - 5, 24, 10, 36);
    c.beginPath();
    c.moveTo(CELL / 2 - 14, 26);
    c.lineTo(CELL / 2, 4);
    c.lineTo(CELL / 2 + 14, 26);
    c.fill();
  });
  const wear = tileableNoise(size, 16, 4, seed);
  const image = ctx.getImageData(0, 0, size, size);
  for (let index = 0; index < size * size; index += 1) {
    const isPaint = index % size < CELL * 3 && Math.floor(index / size) < CELL;
    if (isPaint) image.data[index * 4 + 3] = clamp255(image.data[index * 4 + 3] * (0.35 + wear[index] * 0.9));
  }
  ctx.putImageData(image, 0, 0);
  const texture = toTexture(canvas, { colour: true, repeat: false });
  texture.premultiplyAlpha = false;
  return texture;
}

/** Surface height for paint and ribbons along an edge kind. */
function surfaceHeight(kind, x, z) {
  if (kind === 'causeway' && x > CAUSEWAY.x0) return deckHeight(x) + 0.14;
  if (kind === 'winding') return heightAt(x, z) + 0.14;
  return heightAt(x, z);
}

function cellUv(cell) {
  const s = 1 / CELLS;
  const u0 = cell[0] * s + 0.01;
  const u1 = (cell[0] + 1) * s - 0.01;
  const v1 = 1 - cell[1] * s - 0.01;
  const v0 = 1 - (cell[1] + 1) * s + 0.01;
  return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
}

/** A flat decal rectangle centred at (x, z), `length` along dir and `width` across, lifted above the road. */
function decal(builder, kind, x, z, dir, length, width, cell) {
  const rx = -dir.z;
  const rz = dir.x;
  const hl = length / 2;
  const hw = width / 2;
  const corners = [
    [x - dir.x * hl - rx * hw, z - dir.z * hl - rz * hw],
    [x - dir.x * hl + rx * hw, z - dir.z * hl + rz * hw],
    [x + dir.x * hl + rx * hw, z + dir.z * hl + rz * hw],
    [x + dir.x * hl - rx * hw, z + dir.z * hl - rz * hw],
  ].map(([px, pz]) => [px, surfaceHeight(kind, px, pz) + 0.035, pz]);
  const cross = (corners[1][0] - corners[0][0]) * (corners[2][2] - corners[0][2])
    - (corners[1][2] - corners[0][2]) * (corners[2][0] - corners[0][0]);
  const ordered = cross > 0 ? [corners[0], corners[3], corners[2], corners[1]] : corners;
  const uvs = cellUv(cell);
  builder.quad(ordered, [0, 1, 0], cross > 0 ? [uvs[0], uvs[3], uvs[2], uvs[1]] : uvs);
}

function line(builder, kind, start, dir, from, to, offset, width, cell, dash = 0, gap = 0) {
  const rx = -dir.z;
  const rz = dir.x;
  const pieces = [];
  if (dash > 0) {
    for (let t = from; t + dash <= to; t += dash + gap) pieces.push([t, t + dash]);
  } else {
    const count = Math.max(1, Math.ceil((to - from) / PIECE));
    const step = (to - from) / count;
    for (let k = 0; k < count; k += 1) pieces.push([from + step * k, from + step * (k + 1)]);
  }
  for (const [a, b] of pieces) {
    const t = (a + b) / 2;
    const x = start.x + dir.x * t + rx * offset;
    const z = start.z + dir.z * t + rz * offset;
    decal(builder, kind, x, z, dir, b - a, width, cell);
  }
}

function paintEdge(builder, graph, edge, random) {
  const a = graph.nodes[edge.from];
  const b = graph.nodes[edge.to];
  const dir = { x: edge.dirX, z: edge.dirZ };
  const junctionA = a.edges.length >= 3;
  const junctionB = b.edges.length >= 3;
  const trimA = junctionA ? a.radius + 4.6 : 0;
  const trimB = junctionB ? b.radius + 4.6 : 0;
  const from = trimA;
  const to = edge.length - trimB;
  if (to - from < 2) return;
  const half = edge.width / 2;
  const kind = edge.kind;
  if (edge.width >= 16) {
    line(builder, kind, a, dir, from, to, 0.2, 0.14, MARK.yellow);
    line(builder, kind, a, dir, from, to, -0.2, 0.14, MARK.yellow);
    line(builder, kind, a, dir, from, to, half / 2, 0.14, MARK.white, 3, 6);
    line(builder, kind, a, dir, from, to, -half / 2, 0.14, MARK.white, 3, 6);
  } else if (edge.width >= 11) {
    line(builder, kind, a, dir, from, to, 0, 0.15, MARK.white, 3, 5);
  } else {
    line(builder, kind, a, dir, from, to, 0, 0.12, MARK.yellow, 2.5, 4);
  }
  if (edge.width >= 14) {
    line(builder, kind, a, dir, from, to, half - 0.7, 0.14, MARK.white);
    line(builder, kind, a, dir, from, to, -(half - 0.7), 0.14, MARK.white);
  }
  const rx = -dir.z;
  const rz = dir.x;
  const crossings = [];
  if (junctionA) crossings.push({ t: a.radius + 2.2, side: -1, stop: a.radius + 4.3 });
  if (junctionB) crossings.push({ t: edge.length - b.radius - 2.2, side: 1, stop: edge.length - b.radius - 4.3 });
  for (const crossing of crossings) {
    for (let offset = -half + 1; offset <= half - 1; offset += 1.1) {
      const x = a.x + dir.x * crossing.t + rx * offset;
      const z = a.z + dir.z * crossing.t + rz * offset;
      decal(builder, kind, x, z, dir, 3, 0.55, MARK.zebra);
    }
    const stopOffset = crossing.side * (half / 2);
    const sx = a.x + dir.x * crossing.stop + rx * stopOffset;
    const sz = a.z + dir.z * crossing.stop + rz * stopOffset;
    decal(builder, kind, sx, sz, { x: rx, z: rz }, half - 0.6, 0.45, MARK.white);
    if (edge.width >= 12) {
      const arrowT = crossing.stop - crossing.side * 7;
      const ax = a.x + dir.x * arrowT + rx * stopOffset;
      const az = a.z + dir.z * arrowT + rz * stopOffset;
      const arrowDir = { x: dir.x * crossing.side, z: dir.z * crossing.side };
      decal(builder, kind, ax, az, arrowDir, 4.5, 1.3, MARK.arrow);
    }
  }
  for (let t = from + random.range(5, 20); t < to - 3; t += random.range(28, 50)) {
    const offset = random.range(-half * 0.5, half * 0.5);
    decal(builder, kind, a.x + dir.x * t + rx * offset, a.z + dir.z * t + rz * offset, dir, 0.9, 0.9, MARK.manhole);
  }
  if (edge.kind === 'street' && to - from > 20) {
    for (const side of [-1, 1]) {
      const t = from + random.range(4, 12);
      const offset = side * (half - 0.4);
      decal(builder, kind, a.x + dir.x * t + rx * offset, a.z + dir.z * t + rz * offset, dir, 1.0, 0.6, MARK.grate);
    }
  }
}

/** Asphalt ribbons for roads that leave the flat grid: the winding hill road and the causeway deck. */
function ribbon(points, width, kind) {
  const positions = [];
  const surfaces = [];
  const indices = [];
  for (let index = 0; index < points.length; index += 1) {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dz = next.z - prev.z;
    const length = Math.hypot(dx, dz) || 1;
    const rx = -dz / length;
    const rz = dx / length;
    const p = points[index];
    for (const side of [-1, 1]) {
      const x = p.x + rx * (width / 2) * side;
      const z = p.z + rz * (width / 2) * side;
      positions.push(x, surfaceHeight(kind, x, z) - 0.02, z);
      surfaces.push(1, 0, 0);
    }
    if (index > 0) {
      const base = (index - 1) * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  return { positions, surfaces, indices };
}

function ribbonMesh(parts, material) {
  const positions = [];
  const surfaces = [];
  const indices = [];
  for (const part of parts) {
    const offset = positions.length / 3;
    positions.push(...part.positions);
    surfaces.push(...part.surfaces);
    indices.push(...part.indices.map((i) => i + offset));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSurface', new THREE.Float32BufferAttribute(surfaces, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'road-ribbons';
  mesh.receiveShadow = true;
  return mesh;
}

/** Road paint mesh plus ribbons for the winding road and causeway (sharing the terrain material). */
export function createRoads(layout, terrainMaterial, seed) {
  const random = createRandom(seed * 37 + 5);
  const builder = new MeshBuilder({ position: 3, normal: 3, uv: 2 });
  for (const edge of layout.graph.edges) paintEdge(builder, layout.graph, edge, random);
  const material = new THREE.MeshStandardMaterial({
    map: markingAtlas(seed),
    transparent: true,
    depthWrite: false,
    roughness: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const paint = new THREE.Mesh(builder.build(), material);
  paint.name = 'road-paint';
  paint.receiveShadow = true;
  paint.renderOrder = 1;

  const causewayPoints = [];
  for (let x = CAUSEWAY.x0 + 4; x <= CAUSEWAY.x1 + 6; x += 4) causewayPoints.push({ x, z: layout.causewayZ });
  const ribbons = ribbonMesh([
    ribbon(layout.winding, 9.5, 'winding'),
    ribbon(causewayPoints, 12, 'causeway'),
  ], terrainMaterial);
  return { paint, ribbons };
}
