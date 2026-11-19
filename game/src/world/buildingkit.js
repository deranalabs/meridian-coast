// Facade geometry primitives: boxes with bay/storey UVs, gable roofs, parapets and cornices on one builder.
import { MeshBuilder } from '../core/meshbuilder.js';
import { ATLAS_ROWS, TILE_CELL, ALWAYS_LIT } from './facades.js';

const LIT_NEVER = new Set([
  'roofGravel', 'roofTerracotta', 'roofMetal', 'cornice', 'parapet', 'plainWall', 'corrugated',
]);

/** Atlas attribute for a tile name: column, flipped row, lit mode (0 random, 1 always, 2 never). */
export function tileAttribute(name) {
  const [column, row] = TILE_CELL[name];
  const mode = ALWAYS_LIT.has(name) ? 1 : LIT_NEVER.has(name) ? 2 : 0;
  return [column, ATLAS_ROWS - 1 - row, mode, 0];
}

export function createFacadeBuilder() {
  return new MeshBuilder(
    { position: 3, normal: 3, aFacadeUv: 2, aTile: 4, aTint: 3, aSeed: 1 },
    { aTint: [1, 1, 1], aSeed: 0 },
    'aFacadeUv',
  );
}

/**
 * One vertical wall from (ax, az) to (bx, bz) between y0 and y1, facing to the right of a->b.
 * uv: u counts bays (rounded to whole bays of `bay` metres), v counts storeys from `vStart`.
 */
export function addWall(builder, a, b, y0, y1, look) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (length < 0.01 || y1 - y0 < 0.01) return;
  const nx = (b.z - a.z) / length;
  const nz = -(b.x - a.x) / length;
  const bays = Math.max(1, Math.round(length / look.bay));
  const v0 = look.vStart ?? 0;
  const v1 = v0 + (y1 - y0) / look.storey;
  const extras = { aTile: tileAttribute(look.tile), aTint: look.tint, aSeed: look.seed };
  builder.quad(
    [[b.x, y0, b.z], [a.x, y0, a.z], [a.x, y1, a.z], [b.x, y1, b.z]],
    [nx, 0, nz],
    [[0, v0], [bays, v0], [bays, v1], [0, v1]],
    extras,
  );
}

/** Four walls of an axis-aligned box (outward facing) and, unless `roof` is null, a flat top. */
export function addBox(builder, box, look, roof = 'roofGravel') {
  const { x0, z0, x1, z1, y0, y1 } = box;
  addWall(builder, { x: x0, z: z0 }, { x: x1, z: z0 }, y0, y1, look);
  addWall(builder, { x: x1, z: z0 }, { x: x1, z: z1 }, y0, y1, look);
  addWall(builder, { x: x1, z: z1 }, { x: x0, z: z1 }, y0, y1, look);
  addWall(builder, { x: x0, z: z1 }, { x: x0, z: z0 }, y0, y1, look);
  if (roof) addRoof(builder, box, roof, look);
}

export function addRoof(builder, box, tile, look) {
  const { x0, z0, x1, z1, y1 } = box;
  const scale = 0.25;
  builder.quad(
    [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
    [0, 1, 0],
    [[x0 * scale, z1 * scale], [x1 * scale, z1 * scale], [x1 * scale, z0 * scale], [x0 * scale, z0 * scale]],
    { aTile: tileAttribute(tile), aTint: look.roofTint ?? [1, 1, 1], aSeed: look.seed },
  );
}

/** A low wall ring around a roof edge, `thickness` thick and `height` tall, with a capped top. */
export function addParapet(builder, box, height, thickness, look) {
  const { x0, z0, x1, z1, y1 } = box;
  const trim = { ...look, tile: 'parapet', vStart: 0, storey: height };
  const inner = { x0: x0 + thickness, z0: z0 + thickness, x1: x1 - thickness, z1: z1 - thickness };
  const top = y1 + height;
  addWall(builder, { x: x0, z: z0 }, { x: x1, z: z0 }, y1, top, trim);
  addWall(builder, { x: x1, z: z0 }, { x: x1, z: z1 }, y1, top, trim);
  addWall(builder, { x: x1, z: z1 }, { x: x0, z: z1 }, y1, top, trim);
  addWall(builder, { x: x0, z: z1 }, { x: x0, z: z0 }, y1, top, trim);
  addWall(builder, { x: inner.x1, z: inner.z0 }, { x: inner.x0, z: inner.z0 }, y1, top, trim);
  addWall(builder, { x: inner.x1, z: inner.z1 }, { x: inner.x1, z: inner.z0 }, y1, top, trim);
  addWall(builder, { x: inner.x0, z: inner.z1 }, { x: inner.x1, z: inner.z1 }, y1, top, trim);
  addWall(builder, { x: inner.x0, z: inner.z0 }, { x: inner.x0, z: inner.z1 }, y1, top, trim);
  const cap = { aTile: tileAttribute('parapet'), aTint: look.tint, aSeed: look.seed };
  const strips = [
    [x0, z0, x1, inner.z0],
    [x0, inner.z1, x1, z1],
    [x0, inner.z0, inner.x0, inner.z1],
    [inner.x1, inner.z0, x1, inner.z1],
  ];
  for (const [ax, az, bx, bz] of strips) {
    builder.quad(
      [[ax, top, bz], [bx, top, bz], [bx, top, az], [ax, top, az]],
      [0, 1, 0],
      [[0, 0.9], [1, 0.9], [1, 0.95], [0, 0.95]],
      cap,
    );
  }
}

/** A protruding moulded band (cornice) at height y, `depth` out from the box and `height` tall. */
export function addCornice(builder, box, y, height, depth, look) {
  const band = {
    x0: box.x0 - depth,
    z0: box.z0 - depth,
    x1: box.x1 + depth,
    z1: box.z1 + depth,
    y0: y,
    y1: y + height,
  };
  addBox(builder, band, { ...look, tile: 'cornice', vStart: 0, storey: height, bay: 1.6 }, 'parapet');
  const under = { aTile: tileAttribute('cornice'), aTint: look.tint, aSeed: look.seed };
  builder.quad(
    [[band.x0, y, band.z0], [band.x1, y, band.z0], [band.x1, y, band.z1], [band.x0, y, band.z1]],
    [0, -1, 0],
    [[0, 0.1], [1, 0.1], [1, 0.12], [0, 0.12]],
    under,
  );
}

/** A pitched (gable) roof over a box, ridge along the longer side, with an overhang. */
export function addGableRoof(builder, box, pitch, overhang, look) {
  const alongX = box.x1 - box.x0 >= box.z1 - box.z0;
  const x0 = box.x0 - overhang;
  const x1 = box.x1 + overhang;
  const z0 = box.z0 - overhang;
  const z1 = box.z1 + overhang;
  const y = box.y1;
  const span = alongX ? box.z1 - box.z0 : box.x1 - box.x0;
  const ridge = y + (span / 2) * pitch;
  const roofLook = { aTile: tileAttribute('roofTerracotta'), aTint: look.roofTint ?? [1, 1, 1], aSeed: look.seed };
  const s = 0.3;
  // Each slope's normal from its real run and rise, so a shallow roof catches the low sun as a shallow roof.
  const run = span / 2 + overhang;
  const length = Math.hypot(run, ridge - y);
  const up = run / length;
  const out = (ridge - y) / length;
  if (alongX) {
    const mz = (box.z0 + box.z1) / 2;
    const slope = Math.hypot(mz - z0, ridge - y);
    builder.quad([[x0, y, z1], [x1, y, z1], [x1, ridge, mz], [x0, ridge, mz]], [0, up, out],
      [[x0 * s, 0], [x1 * s, 0], [x1 * s, slope * s], [x0 * s, slope * s]], roofLook);
    builder.quad([[x1, y, z0], [x0, y, z0], [x0, ridge, mz], [x1, ridge, mz]], [0, up, -out],
      [[x1 * s, 0], [x0 * s, 0], [x0 * s, slope * s], [x1 * s, slope * s]], roofLook);
    addGableEnd(builder, { x: box.x0, z: box.z1 }, { x: box.x0, z: box.z0 }, y, ridge, look, [-1, 0, 0]);
    addGableEnd(builder, { x: box.x1, z: box.z0 }, { x: box.x1, z: box.z1 }, y, ridge, look, [1, 0, 0]);
  } else {
    const mx = (box.x0 + box.x1) / 2;
    const slope = Math.hypot(mx - x0, ridge - y);
    builder.quad([[x1, y, z1], [x1, y, z0], [mx, ridge, z0], [mx, ridge, z1]], [out, up, 0],
      [[z1 * s, 0], [z0 * s, 0], [z0 * s, slope * s], [z1 * s, slope * s]], roofLook);
    builder.quad([[x0, y, z0], [x0, y, z1], [mx, ridge, z1], [mx, ridge, z0]], [-out, up, 0],
      [[z0 * s, 0], [z1 * s, 0], [z1 * s, slope * s], [z0 * s, slope * s]], roofLook);
    addGableEnd(builder, { x: box.x0, z: box.z0 }, { x: box.x1, z: box.z0 }, y, ridge, look, [0, 0, -1]);
    addGableEnd(builder, { x: box.x1, z: box.z1 }, { x: box.x0, z: box.z1 }, y, ridge, look, [0, 0, 1]);
  }
  return ridge;
}

function addGableEnd(builder, a, b, y, ridge, look, normal) {
  const extras = { aTile: tileAttribute('plainWall'), aTint: look.tint, aSeed: look.seed };
  const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const base = builder.count;
  builder.vertex({ ...extras, position: [a.x, y, a.z], normal, aFacadeUv: [0, 0] });
  builder.vertex({ ...extras, position: [b.x, y, b.z], normal, aFacadeUv: [1, 0] });
  builder.vertex({ ...extras, position: [mid.x, ridge, mid.z], normal, aFacadeUv: [0.5, 0.6] });
  builder.triangle(base + 1, base, base + 2);
}
