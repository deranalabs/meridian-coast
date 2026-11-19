// Prop placement: walks every block's kerb and roofs, then draws each prop type as one InstancedMesh.
import * as THREE from '../../vendor/three.module.min.js';
import * as models from './propmodels.js';
import { createPropMaterial } from './propmaterial.js';
import { BLADE_WIDTH } from './signs.js';
import { createCulledInstances } from './instancing.js';
import { heightAt, BOARDWALK, WATER_LEVEL } from './heightfield.js';
import { PARK } from './districts.js';
import { polygonArea } from './geometry2d.js';
import { createRandom } from '../core/random.js';
import { UNITS } from '../palette.js';

const KERB = UNITS.kerbHeight;

/** Prop types: geometry factory, whether it casts shadows, and how many seeded variants share one mesh. */
const TYPES = {
  lamp: { make: models.streetLamp, shadow: true },
  hydrant: { make: models.hydrant, shadow: false },
  bin: { make: models.bin, shadow: false },
  sign: { make: models.streetSign, shadow: false },
  signal: { make: models.trafficLight, shadow: true },
  bench: { make: models.bench, shadow: false },
  meter: { make: models.parkingMeter, shadow: false },
  news: { make: models.newsBox, shadow: false },
  bollard: { make: models.bollard, shadow: false },
  planter: { make: models.planter, shadow: false },
  palm: { make: () => models.palm(3), shadow: true },
  palmTall: { make: () => models.palm(11), shadow: true },
  tree: { make: () => models.tree(5), shadow: true },
  ac: { make: models.acUnit, shadow: false },
  tank: { make: models.waterTank, shadow: true },
  antenna: { make: models.antenna, shadow: false },
  container: { make: models.container, shadow: true },
  shelter: { make: models.busShelter, shadow: false },
  umbrella: { make: () => models.umbrella(4), shadow: false },
  lounger: { make: models.lounger, shadow: false },
  lifeguard: { make: models.lifeguardTower, shadow: true },
  signBox: { make: models.signBox, shadow: false },
  billboard: { make: models.billboardFrame, shadow: true },
  awning: { make: models.awning, shadow: false },
  crate: { make: models.crate, shadow: false },
};

function createPlacements() {
  const lists = Object.fromEntries(Object.keys(TYPES).map((name) => [name, []]));
  return {
    lists,
    add(type, x, y, z, rot = 0, scale = 1, colour = null) {
      lists[type].push({ x, y, z, rot, scale, colour });
    },
  };
}

/** Walk the outer edges of a block: callback(point, inwardNormal, edgeDir, t, edgeLength, edgeIndex). */
function walkKerb(block, spacing, inset, random, callback) {
  const polygon = block.polygon;
  const sign = polygonArea(polygon) > 0 ? 1 : -1;
  polygon.forEach((a, edgeIndex) => {
    const b = polygon[(edgeIndex + 1) % polygon.length];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 6) return;
    const dir = { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
    const inward = { x: -dir.z * sign, z: dir.x * sign };
    const start = random.range(spacing * 0.3, spacing * 0.7);
    for (let t = start; t < length - 2; t += spacing) {
      const point = { x: a.x + dir.x * t + inward.x * inset, z: a.z + dir.z * t + inward.z * inset };
      callback(point, inward, dir, t, length, edgeIndex);
    }
  });
}

function facing(inward) {
  return Math.atan2(-inward.x, -inward.z);
}

function ground(x, z) {
  return heightAt(x, z) + KERB;
}

function dressBlock(place, block, random, parking) {
  const district = block.district;
  const lampSpacing = district === 'heights' ? 22 : 26;
  walkKerb(block, lampSpacing, 0.55, random, (p, inward) => {
    place.add('lamp', p.x, ground(p.x, p.z), p.z, facing(inward) - Math.PI / 2);
  });
  const greenery = district === 'beach' ? 'palm' : district === 'neon' ? 'palmTall' : 'tree';
  const greenSpacing = district === 'harbor' ? 60 : district === 'neon' ? 22 : district === 'heights' ? 21 : 15;
  walkKerb(block, greenSpacing, 1.3, random, (p) => {
    if (district === 'harbor' && random.chance(0.5)) return;
    const type = greenery === 'tree' && district === 'heights' && random.chance(0.4) ? 'planter' : greenery;
    place.add(type, p.x, ground(p.x, p.z), p.z, random.range(0, Math.PI * 2), random.range(0.85, 1.15));
  });
  walkKerb(block, 9, 0.6, random, (p, inward, dir, t, length) => {
    if (t < 9 || t > length - 9) return;
    const roll = random.next();
    const rot = facing(inward);
    const y = ground(p.x, p.z);
    if (district === 'neon' || district === 'beach') {
      if (roll < 0.35) place.add('meter', p.x, y, p.z, rot);
      else if (roll < 0.45) place.add('bollard', p.x, y, p.z);
      else if (roll < 0.55) place.add('news', p.x + inward.x * 1.4, y, p.z + inward.z * 1.4, rot + Math.PI);
    } else if (roll < 0.25) {
      place.add('bollard', p.x, y, p.z);
    }
    const offset = 2.6;
    if (random.chance(district === 'harbor' ? 0.25 : 0.6)) {
      parking.push({ x: p.x - inward.x * offset, z: p.z - inward.z * offset, rot: Math.atan2(dir.x, dir.z) });
    }
  });
  walkKerb(block, 40, 1.4, random, (p, inward, dir, t, length, edgeIndex) => {
    const rot = facing(inward);
    const y = ground(p.x, p.z);
    const slot = (edgeIndex + Math.floor(t)) % 4;
    if (slot === 0) place.add('hydrant', p.x, y, p.z, rot);
    else if (slot === 1) place.add('bin', p.x, y, p.z, rot);
    else if (slot === 2) place.add('bench', p.x + inward.x * 1.2, y, p.z + inward.z * 1.2, rot + Math.PI);
    else if (district !== 'heights') place.add('shelter', p.x + inward.x * 0.6, y, p.z + inward.z * 0.6, rot + Math.PI);
    else place.add('bin', p.x, y, p.z, rot);
  });
  const corners = block.polygon;
  const sign = polygonArea(corners) > 0 ? 1 : -1;
  corners.forEach((corner, index) => {
    const prev = corners[(index + corners.length - 1) % corners.length];
    const next = corners[(index + 1) % corners.length];
    const ax = prev.x - corner.x;
    const az = prev.z - corner.z;
    const bx = next.x - corner.x;
    const bz = next.z - corner.z;
    const la = Math.hypot(ax, az) || 1;
    const lb = Math.hypot(bx, bz) || 1;
    const inx = ax / la + bx / lb;
    const inz = az / la + bz / lb;
    const li = Math.hypot(inx, inz) || 1;
    const x = corner.x + (inx / li) * 1.3;
    const z = corner.z + (inz / li) * 1.3;
    const outward = Math.atan2(-inx, -inz);
    if (district === 'neon' || district === 'beach' || (district === 'harbor' && index % 2 === 0)) {
      place.add('signal', x, ground(x, z), z, outward + Math.PI / 4 * sign);
    } else {
      place.add('sign', x, ground(x, z), z, outward);
    }
  });
}

function dressRoofs(place, roofs, random) {
  for (const roof of roofs) {
    const w = roof.x1 - roof.x0;
    const d = roof.z1 - roof.z0;
    if (w < 3 || d < 3 || roof.kind === 'gable') continue;
    if (roof.kind === 'spire') {
      place.add('antenna', (roof.x0 + roof.x1) / 2, roof.y, (roof.z0 + roof.z1) / 2, 0, random.range(0.8, 1.6));
      continue;
    }
    const units = Math.min(6, Math.floor((w * d) / 60) + 1);
    for (let k = 0; k < units; k += 1) {
      const x = random.range(roof.x0 + 1, roof.x1 - 1);
      const z = random.range(roof.z0 + 1, roof.z1 - 1);
      if (roof.hole && x > roof.hole.x0 - 1 && x < roof.hole.x1 + 1 && z > roof.hole.z0 - 1 && z < roof.hole.z1 + 1) {
        continue;
      }
      place.add('ac', x, roof.y, z, random.pick([0, Math.PI / 2]));
    }
    if ((roof.district === 'heights' || roof.district === 'harbor') && random.chance(0.35) && w > 6 && d > 6) {
      place.add('tank', (roof.x0 + roof.x1) / 2 + w * 0.2, roof.y, (roof.z0 + roof.z1) / 2, 0);
    }
    if (roof.kind === 'tower' && random.chance(0.5)) {
      place.add('antenna', roof.x0 + 1.5, roof.y, roof.z0 + 1.5, 0, random.range(0.6, 1.1));
    }
  }
}

function dressBeach(place, random, causewayZ) {
  for (let z = -410; z < 175; z += 13) {
    const x = BOARDWALK.x1 + 1.5;
    if (Math.abs(z - causewayZ) > 12) place.add('palm', x, heightAt(x, z), z, random.range(0, 6.28));
    place.add('lamp', BOARDWALK.x0 + 0.6, 0.62, z + 6, Math.PI);
  }
  for (let z = -400; z < 170; z += 7) {
    if (Math.abs(z - causewayZ) < 14) continue;
    const x = random.range(420, 452);
    if (heightAt(x, z) < WATER_LEVEL + 0.15) continue;
    if (random.chance(0.6)) {
      place.add('umbrella', x, heightAt(x, z), z, 0, 1, random.pick(['#ff5fa2', '#3fd0c4', '#ffd166', '#ffffff']));
      place.add('lounger', x + 1.1, heightAt(x + 1.1, z), z + 0.4, Math.PI / 2 + random.range(-0.3, 0.3));
      if (random.chance(0.5)) place.add('lounger', x - 1.1, heightAt(x - 1.1, z), z, Math.PI / 2);
    }
  }
  for (const z of [-330, -60, 120]) place.add('lifeguard', 440, heightAt(440, z), z, Math.PI / 2);
}

function dressPark(place, random) {
  const r = PARK.rect;
  for (let k = 0; k < 120; k += 1) {
    const x = random.range(r.x0 + 12, r.x1 - 12);
    const z = random.range(r.z0 + 12, r.z1 - 12);
    if (Math.hypot(x, z - (r.z0 + r.z1) / 2) < 22) continue;
    if (Math.abs(z - (r.z0 + r.z1) / 2) < 3.5 || Math.abs(x) < 3.5) continue;
    const type = random.chance(0.75) ? 'tree' : 'palmTall';
    place.add(type, x, heightAt(x, z), z, random.range(0, 6.28), random.range(0.9, 1.4));
  }
  for (let x = r.x0 + 15; x < r.x1 - 10; x += 22) {
    const z = (r.z0 + r.z1) / 2;
    place.add('lamp', x, heightAt(x, z), z + 3.2, 0);
    place.add('bench', x + 8, heightAt(x, z), z - 3, 0);
  }
}

function dressHarbour(place, random, quayZ) {
  for (let x = -180; x < 370; x += 7.5) {
    if (random.chance(0.3)) continue;
    const z = quayZ - 6 + random.range(-0.5, 0.5);
    const stack = random.int(1, 3);
    for (let level = 0; level < stack; level += 1) {
      const colour = random.pick(['#c0392b', '#2e86ab', '#f4a261', '#2a9d8f', '#e9c46a', '#6d597a', '#8d99ae']);
      place.add('container', x, heightAt(x, z) + level * 2.6, z, Math.PI / 2, 1, colour);
    }
  }
  for (let k = 0; k < 40; k += 1) {
    const x = random.range(-150, 350);
    place.add('crate', x, heightAt(x, quayZ - 14), quayZ - 14 + random.range(-2, 2), random.range(0, 1));
  }
}

function dressAwnings(place, awnings) {
  for (const awning of awnings) {
    place.add('awning', awning.x, awning.y, awning.z, awning.rot, [awning.width, 1, awning.depth], awning.colour);
  }
}

const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempPosition = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);

/** Big props stay drawn further out than street clutter; everything beyond is fogged or too small to see. */
const FAR_TYPES = new Set(['lamp', 'palm', 'palmTall', 'tree', 'signal', 'billboard', 'container', 'antenna', 'tank',
  'lifeguard', 'awning', 'signBox']);

function instance(type, placements, material) {
  const geometry = TYPES[type].make();
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
  const matrices = placements.map((p) => {
    tempPosition.set(p.x, p.y, p.z);
    tempQuaternion.setFromAxisAngle(yAxis, p.rot);
    if (Array.isArray(p.scale)) tempScale.set(p.scale[0], p.scale[1], p.scale[2]);
    else tempScale.setScalar(p.scale);
    return new THREE.Matrix4().compose(tempPosition, tempQuaternion, tempScale);
  });
  const tinted = placements.some((p) => p.colour);
  const colours = tinted ? placements.map((p) => new THREE.Color(p.colour ?? '#ffffff')) : null;
  if (tinted) mesh.setColorAt(0, colours[0]);
  mesh.castShadow = TYPES[type].shadow;
  mesh.receiveShadow = true;
  mesh.name = `props-${type}`;
  return createCulledInstances(mesh, matrices, colours, FAR_TYPES.has(type) ? 300 : 140);
}

/**
 * Place all props; returns {group, placements, parking, lamps} where lamps lists lamp-head positions for
 * the light pools and halos.
 */
export function createProps(layout, buildings, billboards, textures, timeOfDay, seed) {
  const random = createRandom(seed * 131 + 17);
  const place = createPlacements();
  const parking = [];
  for (const block of layout.blocks) dressBlock(place, block, random.fork(block.id), parking);
  dressRoofs(place, buildings.roofs, random.fork(901));
  dressBeach(place, random.fork(902), layout.causewayZ);
  dressPark(place, random.fork(903));
  dressHarbour(place, random.fork(904), 462);
  dressAwnings(place, buildings.awnings);
  for (const board of billboards) place.add('billboard', board.x, board.y, board.z, board.rot);
  for (const s of buildings.signs) {
    if (s.kind === 'flat') place.add('signBox', s.x, s.y, s.z, s.rot, [s.width + 0.8, 2.0, 1]);
    if (s.kind === 'blade') {
      const nx = Math.sin(s.rot) * 0.078;
      const nz = Math.cos(s.rot) * 0.078;
      place.add('signBox', s.x + nx, s.y, s.z + nz, s.rot, [BLADE_WIDTH + 0.3, 1.4, 0.6]);
    }
  }

  const level = timeOfDay.lampLevel;
  const material = createPropMaterial(textures.data, level);
  const foliage = createPropMaterial(textures.data, level, { side: THREE.DoubleSide });
  const group = new THREE.Group();
  group.name = 'props';
  const culled = [];
  for (const type of Object.keys(TYPES)) {
    const list = place.lists[type];
    if (!list.length) continue;
    const doubleSided = type === 'palm' || type === 'palmTall' || type === 'umbrella';
    const entry = instance(type, list, doubleSided ? foliage : material);
    culled.push(entry);
    group.add(entry.mesh);
  }
  const lamps = place.lists.lamp.map((p) => ({
    x: p.x + Math.sin(p.rot + Math.PI / 2) * 1.85,
    y: p.y + 6.0,
    z: p.z + Math.cos(p.rot + Math.PI / 2) * 1.85,
  }));
  const count = Object.values(place.lists).reduce((sum, list) => sum + list.length, 0);
  return {
    group,
    placements: place.lists,
    parking,
    lamps,
    count,
    /** Upload the instances near `point` (call every frame; it only does work after the camera moves). */
    update(point) {
      for (const entry of culled) entry.refresh(point);
    },
  };
}
