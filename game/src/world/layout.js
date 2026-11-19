// City layout as plain data: road segments, blocks (convex sidewalk slabs) and building lots per district.
import { DISTRICT_LIST, PARK } from './districts.js';
import { buildRoadGraph } from './roadgraph.js';
import { clipHalfPlane, insetConvex, pointInConvex, polygonArea, rectPolygon } from './geometry2d.js';
import { BEACH_ROAD_X, ISLAND, STADIUM } from './heightfield.js';
import { createRandom } from '../core/random.js';

const STREET_NAMES = {
  neon: ['Halcyon Ave', 'Lumen St', 'Cassia Blvd', 'Orrin St', 'Velour Ave', 'Paragon St', 'Indigo Way', 'Sable St'],
  beach: ['Shoreline Parade', 'Gullwing St', 'Tamarind Ave', 'Saltmarsh St', 'Coquina Way', 'Heron St',
    'Sunfish Ave', 'Driftwood St', 'Mangrove Rd'],
  harbor: ['Quayside Rd', 'Bollard St', 'Rigger Ave', 'Tanner St', 'Freight Ln', 'Anchorage Rd', 'Capstan St'],
  heights: ['Calder Rise', 'Bellfry Ln', 'Olive Steps', 'Juniper St', 'Monastery Rd', 'Vista Ln', 'Quarry St',
    'Lantern Hill', 'Tiller St', 'Fig Row', 'Carob St', 'Acacia Ln', 'Pinecrest Rd', 'Old Mill St'],
};

export const DIAGONAL = Object.freeze({
  a: { x: -200, z: 180 },
  b: { x: 200, z: -300 },
  width: 18,
  name: 'Meridian Diagonal',
});

const WINDING_POINTS = [
  [-520, -40], [-552, -36], [-588, -12], [-624, -22], [-640, -58], [-616, -92], [-584, -118],
  [-598, -156], [-640, -176], [-684, -168], [-716, -140],
];

/** Grid lines spread evenly across [start, end] at roughly `step` apart. */
function gridLines(start, end, step) {
  const count = Math.max(1, Math.round((end - start) / step));
  const lines = [];
  for (let index = 0; index <= count; index += 1) lines.push(start + ((end - start) * index) / count);
  return lines;
}

/** Merge collinear axis lines that share a coordinate: one long line, the widest width. */
function addAxisLine(lines, axis, coord, from, to, width, name) {
  const key = `${axis}:${Math.round(coord * 10)}`;
  const existing = lines.get(key);
  if (existing) {
    existing.from = Math.min(existing.from, from);
    existing.to = Math.max(existing.to, to);
    existing.width = Math.max(existing.width, width);
    return existing;
  }
  const line = { axis, coord, from, to, width, name };
  lines.set(key, line);
  return line;
}

function catmullRom(points, step) {
  const out = [];
  for (let index = 0; index + 1 < points.length; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const samples = Math.max(2, Math.ceil(length / step));
    for (let s = 0; s < samples; s += 1) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const blend = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2
        + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: blend(p0[0], p1[0], p2[0], p3[0]), z: blend(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  const last = points[points.length - 1];
  out.push({ x: last[0], z: last[1] });
  return out;
}

function diagonalFrame() {
  const dx = DIAGONAL.b.x - DIAGONAL.a.x;
  const dz = DIAGONAL.b.z - DIAGONAL.a.z;
  const length = Math.hypot(dx, dz);
  return { origin: DIAGONAL.a, dir: { x: dx / length, z: dz / length }, normal: { x: -dz / length, z: dx / length } };
}

/** Split a block polygon by the diagonal avenue's corridor; returns 0, 1 or 2 pieces. */
function cutByDiagonal(polygon, sidewalk) {
  const frame = diagonalFrame();
  const half = DIAGONAL.width / 2;
  const negative = { x: -frame.normal.x, z: -frame.normal.z };
  const left = clipHalfPlane(polygon, frame.origin, frame.normal, half);
  const right = clipHalfPlane(polygon, frame.origin, negative, half);
  const minimum = Math.max(160, sidewalk * sidewalk * 10);
  return [left, right].filter((piece) => piece.length >= 3 && Math.abs(polygonArea(piece)) > minimum);
}

function lineWidthAt(lines, axis, coord) {
  return lines.get(`${axis}:${Math.round(coord * 10)}`)?.width ?? 12;
}

/** Recursively split a rectangle into lots no bigger than `size` on either side. */
function splitLots(rect, size, random, out, depth = 0) {
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  if ((w <= size * 1.3 && d <= size * 1.3) || depth > 6) {
    out.push(rect);
    return;
  }
  const t = random.range(0.38, 0.62);
  if (w >= d) {
    const cut = rect.x0 + w * t;
    splitLots({ ...rect, x1: cut }, size, random, out, depth + 1);
    splitLots({ ...rect, x0: cut }, size, random, out, depth + 1);
  } else {
    const cut = rect.z0 + d * t;
    splitLots({ ...rect, z1: cut }, size, random, out, depth + 1);
    splitLots({ ...rect, z0: cut }, size, random, out, depth + 1);
  }
}

/** Which inner-rect edges the lot touches: the street fronts its facade faces. */
function lotFronts(lot, inner) {
  const fronts = [];
  const eps = 0.01;
  if (Math.abs(lot.z0 - inner.z0) < eps) fronts.push('n');
  if (Math.abs(lot.z1 - inner.z1) < eps) fronts.push('s');
  if (Math.abs(lot.x0 - inner.x0) < eps) fronts.push('w');
  if (Math.abs(lot.x1 - inner.x1) < eps) fronts.push('e');
  return fronts;
}

function boundsOf(polygon) {
  const xs = polygon.map((p) => p.x);
  const zs = polygon.map((p) => p.z);
  return { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) };
}

function makeLots(block, district, random) {
  const inner = insetConvex(block.polygon, district.sidewalk);
  if (inner.length < 3) return [];
  const bounds = boundsOf(inner);
  const rects = [];
  splitLots(bounds, district.lot, random, rects);
  const lots = [];
  for (const rect of rects) {
    const corners = rectPolygon(rect.x0, rect.z0, rect.x1, rect.z1);
    if (!corners.every((corner) => pointInConvex(inner, corner))) continue;
    if (rect.x1 - rect.x0 < 7 || rect.z1 - rect.z0 < 7) continue;
    lots.push({ ...rect, fronts: lotFronts(rect, bounds), district: district.id, block: block.id });
  }
  return lots;
}

function reservedFor(centre) {
  if (Math.hypot(centre.x - 150, centre.z + 100) < 30) return 'casino';
  return null;
}

/** The whole layout for a seed: segments, graph, blocks, lots, and named spots for landmarks. */
export function buildLayout(seed = 1) {
  const random = createRandom(seed * 7919 + 13);
  const lines = new Map();
  const districtLines = new Map();
  for (const district of DISTRICT_LIST) {
    const r = district.rect;
    const xs = gridLines(r.x0, r.x1, district.blockX + district.road);
    const zs = gridLines(r.z0, r.z1, district.blockZ + district.road);
    const names = STREET_NAMES[district.id];
    xs.forEach((x, index) => addAxisLine(lines, 'x', x, r.z0, r.z1, district.road, names[index % names.length]));
    zs.forEach((z, index) => {
      addAxisLine(lines, 'z', z, r.x0, r.x1, district.road, names[(index + xs.length) % names.length]);
    });
    districtLines.set(district.id, { xs, zs });
  }
  const park = PARK.rect;
  addAxisLine(lines, 'z', park.z0, park.x0, park.x1, PARK.road, 'Solano Loop');
  addAxisLine(lines, 'x', park.x0, park.z0, park.z1, PARK.road, 'Solano Loop');
  addAxisLine(lines, 'x', park.x1, park.z0, park.z1, PARK.road, 'Solano Loop');
  addAxisLine(lines, 'x', BEACH_ROAD_X, -420, 450, 14, 'Shoreline Parade');

  const beachZs = districtLines.get('beach').zs;
  const causewayZ = beachZs.reduce((best, z) => (Math.abs(z - ISLAND.z) < Math.abs(best - ISLAND.z) ? z : best));
  const segments = [];
  for (const line of lines.values()) {
    const a = line.axis === 'x' ? { x: line.coord, z: line.from } : { x: line.from, z: line.coord };
    const b = line.axis === 'x' ? { x: line.coord, z: line.to } : { x: line.to, z: line.coord };
    segments.push({ a, b, width: line.width, kind: 'street', name: line.name });
  }
  segments.push({ a: DIAGONAL.a, b: DIAGONAL.b, width: DIAGONAL.width, kind: 'avenue', name: DIAGONAL.name });
  const causeway = { a: { x: BEACH_ROAD_X, z: causewayZ }, b: { x: ISLAND.x - 30, z: causewayZ } };
  segments.push({ ...causeway, width: 12, kind: 'causeway', name: 'Gull Key Causeway' });
  const stadiumRoad = { a: { x: -200, z: STADIUM.z }, b: { x: STADIUM.x + STADIUM.radius - 6, z: STADIUM.z } };
  segments.push({ ...stadiumRoad, width: 14, kind: 'street', name: 'Bowl Approach' });
  const winding = catmullRom(WINDING_POINTS, 6);
  for (let index = 0; index + 1 < winding.length; index += 1) {
    segments.push({ a: winding[index], b: winding[index + 1], width: 9, kind: 'winding', name: 'Calder Switchback' });
  }

  const blocks = [];
  const lots = [];
  for (const district of DISTRICT_LIST) {
    const { xs, zs } = districtLines.get(district.id);
    for (let i = 0; i + 1 < xs.length; i += 1) {
      for (let j = 0; j + 1 < zs.length; j += 1) {
        const x0 = xs[i] + lineWidthAt(lines, 'x', xs[i]) / 2;
        const x1 = xs[i + 1] - lineWidthAt(lines, 'x', xs[i + 1]) / 2;
        const z0 = zs[j] + lineWidthAt(lines, 'z', zs[j]) / 2;
        const z1 = zs[j + 1] - lineWidthAt(lines, 'z', zs[j + 1]) / 2;
        let pieces = [rectPolygon(x0, z0, x1, z1)];
        if (district.id === 'neon') pieces = cutByDiagonal(pieces[0], district.sidewalk);
        for (const polygon of pieces) {
          const bounds = boundsOf(polygon);
          const centre = { x: (bounds.x0 + bounds.x1) / 2, z: (bounds.z0 + bounds.z1) / 2 };
          const block = {
            id: blocks.length,
            district: district.id,
            polygon,
            bounds,
            centre,
            clipped: polygon.length !== 4,
            reserved: reservedFor(centre),
          };
          blocks.push(block);
          if (!block.reserved) lots.push(...makeLots(block, district, random.fork(block.id)));
        }
      }
    }
  }

  const graph = buildRoadGraph(segments);
  return { seed, segments, graph, blocks, lots, causewayZ, winding, districtLines };
}
