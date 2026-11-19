// Ground queries for physics: terrain plus sidewalk slabs, the causeway deck and the hill road ribbon.
import { heightAt, deckHeight, CAUSEWAY, WATER_LEVEL } from './heightfield.js';
import { pointInConvex, distanceToSegment } from './geometry2d.js';
import { UNITS } from '../palette.js';

const CELL = 24;

/** Every grid cell key a box {x0, z0, x1, z1} touches. */
function cellsOf(b) {
  const keys = [];
  for (let gx = Math.floor(b.x0 / CELL); gx <= Math.floor(b.x1 / CELL); gx += 1) {
    for (let gz = Math.floor(b.z0 / CELL); gz <= Math.floor(b.z1 / CELL); gz += 1) keys.push(`${gx},${gz}`);
  }
  return keys;
}

/**
 * Build a query object for a layout: surfaceAt(x, z) returns {height, kind} where kind is a surface name.
 * `buildings` ({x0, z0, x1, z1, top} per lot) feeds roofAt(x, z, reach): the highest roof near a point.
 */
export function createGround(layout, buildings = []) {
  const roofs = new Map();
  for (const b of buildings) {
    for (const key of cellsOf(b)) {
      if (!roofs.has(key)) roofs.set(key, []);
      roofs.get(key).push(b);
    }
  }
  const grid = new Map();
  for (const block of layout.blocks) {
    for (const key of cellsOf(block.bounds)) {
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(block);
    }
  }
  const winding = layout.winding;
  // The hill road's box (grown by its half-width): points outside it skip the per-segment test, which every
  // walker and car would otherwise pay on each step anywhere west of the old town.
  const reach = 5;
  const box = { x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity };
  for (const p of winding) {
    box.x0 = Math.min(box.x0, p.x - reach);
    box.z0 = Math.min(box.z0, p.z - reach);
    box.x1 = Math.max(box.x1, p.x + reach);
    box.z1 = Math.max(box.z1, p.z + reach);
  }

  function blockAt(x, z) {
    const list = grid.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
    if (!list) return null;
    for (const block of list) if (pointInConvex(block.polygon, { x, z })) return block;
    return null;
  }

  function onWinding(x, z) {
    if (x < box.x0 || x > box.x1 || z < box.z0 || z > box.z1) return false;
    const point = { x, z };
    for (let index = 0; index + 1 < winding.length; index += 1) {
      if (distanceToSegment(point, winding[index], winding[index + 1]).distance < reach) return true;
    }
    return false;
  }

  /** The highest building top within `reach` metres of (x, z), or -Infinity over open ground. */
  function roofAt(x, z, reach = 0) {
    let best = -Infinity;
    for (const key of cellsOf({ x0: x - reach, z0: z - reach, x1: x + reach, z1: z + reach })) {
      for (const b of roofs.get(key) ?? []) {
        const dx = Math.max(b.x0 - x, 0, x - b.x1);
        const dz = Math.max(b.z0 - z, 0, z - b.z1);
        if (b.top > best && dx * dx + dz * dz <= reach * reach) best = b.top;
      }
    }
    return best;
  }

  return {
    blockAt,
    onWinding,
    roofAt,
    surfaceAt(x, z) {
      const base = heightAt(x, z);
      if (Math.abs(z - layout.causewayZ) < 6.2 && x > CAUSEWAY.x0 + 4 && x < CAUSEWAY.x1 + 4) {
        return { height: Math.max(base, deckHeight(x) + 0.12), kind: 'deck' };
      }
      if (blockAt(x, z)) return { height: base + UNITS.kerbHeight, kind: 'sidewalk' };
      if (x < -500 && onWinding(x, z)) return { height: base + 0.12, kind: 'road' };
      if (base < WATER_LEVEL - 0.3) return { height: WATER_LEVEL, kind: 'water' };
      return { height: base, kind: 'road' };
    },
  };
}
