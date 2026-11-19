// Pedestrians: ambient people who stroll sidewalk loops around blocks, pause, and are recycled near the player.
import { insetConvex, polygonArea } from '../world/geometry2d.js';
import { DISTRICT_BY_ID } from '../world/districts.js';
import { heightAt } from '../world/heightfield.js';
import { randomAppearance } from './appearance.js';
import { createRandom } from '../core/random.js';
import { UNITS } from '../palette.js';

const KERB = UNITS.kerbHeight;

function walkRing(block) {
  const district = DISTRICT_BY_ID[block.district];
  const ring = insetConvex(block.polygon, district.sidewalk * 0.5 + 0.55);
  if (ring.length < 3 || Math.abs(polygonArea(ring)) < 40) return null;
  const lengths = ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    return Math.hypot(q.x - p.x, q.z - p.z);
  });
  return { points: ring, lengths, total: lengths.reduce((a, b) => a + b, 0) };
}

function pointOnRing(ring, distance) {
  let d = ((distance % ring.total) + ring.total) % ring.total;
  for (let i = 0; i < ring.points.length; i += 1) {
    if (d <= ring.lengths[i]) {
      const p = ring.points[i];
      const q = ring.points[(i + 1) % ring.points.length];
      const t = ring.lengths[i] > 0 ? d / ring.lengths[i] : 0;
      return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t, dx: q.x - p.x, dz: q.z - p.z };
    }
    d -= ring.lengths[i];
  }
  return { x: ring.points[0].x, z: ring.points[0].z, dx: 1, dz: 0 };
}

/**
 * `count` pedestrians on blocks near `focus`; update(dt, focus) walks them and moves anyone who drifts
 * beyond `radius` to a block near the focus again.
 */
export function createPedestrians(characters, layout, count, seed, focus, radius = 110) {
  const random = createRandom(seed * 977 + 41);
  const rings = layout.blocks.map((block) => ({ block, ring: walkRing(block) })).filter((entry) => entry.ring);
  const peds = [];

  function nearbyRing(point) {
    const near = rings.filter(({ block }) => Math.hypot(block.centre.x - point.x, block.centre.z - point.z) < radius);
    return random.pick(near.length ? near : rings);
  }

  function place(ped, point) {
    const entry = nearbyRing(point);
    ped.ring = entry.ring;
    ped.distance = random.range(0, entry.ring.total);
    ped.direction = random.chance(0.5) ? 1 : -1;
    ped.lane = random.range(-0.7, 0.7);
  }

  for (let index = 0; index < count; index += 1) {
    const entry = nearbyRing(focus);
    const appearance = randomAppearance(random, entry.block.district);
    const character = characters.add(appearance, { clip: 'walk', phase: random.next() });
    if (!character) break;
    const ped = {
      character,
      ring: null,
      distance: 0,
      direction: 1,
      lane: 0,
      walkSpeed: random.range(1.15, 1.6),
      pause: random.chance(0.2) ? random.range(1, 6) : 0,
    };
    place(ped, focus);
    peds.push(ped);
  }

  function update(dt, centre) {
    for (const ped of peds) {
      const c = ped.character;
      if (ped.pause > 0) {
        ped.pause -= dt;
        c.speed = 0;
        c.play('idle');
      } else {
        ped.distance += ped.direction * ped.walkSpeed * dt;
        c.speed = ped.walkSpeed;
        c.play('walk');
        if (random.chance(dt * 0.02)) ped.pause = random.range(2, 7);
      }
      const p = pointOnRing(ped.ring, ped.distance);
      const length = Math.hypot(p.dx, p.dz) || 1;
      const sideX = (-p.dz / length) * ped.lane;
      const sideZ = (p.dx / length) * ped.lane;
      const x = p.x + sideX;
      const z = p.z + sideZ;
      c.position.set(x, heightAt(x, z) + KERB, z);
      const target = Math.atan2(p.dx * ped.direction, p.dz * ped.direction);
      let delta = target - c.heading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      c.heading += delta * Math.min(1, dt * 6);
      if (centre && Math.hypot(x - centre.x, z - centre.z) > radius * 1.3) place(ped, centre);
    }
  }

  return { peds, update };
}
