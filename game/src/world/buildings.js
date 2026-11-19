// Building generator: podium, body, setback and crown per lot, plus awning, sign, roof and collider spots.
import * as THREE from '../../vendor/three.module.min.js';
import { DISTRICT_BY_ID } from './districts.js';
import { STYLES } from './facades.js';
import { heightAt } from './heightfield.js';
import { addBox, addCornice, addGableRoof, addParapet, addWall } from './buildingkit.js';
import { createRandom } from '../core/random.js';

const STOREY = 3.4;
const GROUND_STOREY = 4.4;

const TINTS = {
  glass: ['#ffffff', '#e6ecff', '#f0e6ff', '#e0f4f4'],
  office: ['#ffffff', '#f4efe4', '#e4e8f0', '#f6e8e0'],
  deco: ['#fff4e4', '#e8fff2', '#ffe8ee', '#f4ecff', '#fffbe0'],
  brick: ['#ffffff', '#f0e0d8', '#e8e8e8'],
  concrete: ['#ffffff', '#e8e4dc', '#dcdcde', '#f0e8de'],
  pastel: ['#ffc2d4', '#bff0dc', '#ffd8b0', '#c4e4ff', '#fff0a8', '#e2c8ff', '#ffb8a8'],
  stucco: ['#fff2e0', '#ffe4cc', '#f4f0e8', '#ffe8d8'],
  oldtown: ['#f5d9a8', '#e8b48a', '#f0e0c0', '#d98f6a', '#f4c87a', '#e9cfa8', '#c9a27e'],
  warehouse: ['#c8b8a0', '#8fb0a8', '#d0a080', '#a0a8b8', '#c87a5a', '#b8b0a4'],
};

const AWNING_COLOURS = {
  neon: ['#c45cff', '#ff3d7f', '#1e2233', '#3fe0d0'],
  beach: ['#ff5fa2', '#3fe0d0', '#ffd166', '#ff8a5c', '#7ec8ff'],
  harbor: ['#2e6f6b', '#a8472c', '#3d4a5c'],
  heights: ['#2f6b4a', '#a6402c', '#d9a441', '#3f5f8a'],
};

function rgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

function groundRange(box) {
  const samples = [
    heightAt(box.x0, box.z0), heightAt(box.x1, box.z0), heightAt(box.x0, box.z1), heightAt(box.x1, box.z1),
    heightAt((box.x0 + box.x1) / 2, (box.z0 + box.z1) / 2),
  ];
  return { min: Math.min(...samples), max: Math.max(...samples) };
}

/** Vertical uv start so the storey grid ends on a whole storey at the top of a span. */
function alignTop(span, storey) {
  const storeys = span / storey;
  return Math.ceil(storeys - 0.001) - storeys;
}

function inset(box, amount) {
  return { ...box, x0: box.x0 + amount, z0: box.z0 + amount, x1: box.x1 - amount, z1: box.z1 - amount };
}

function frontEdges(box, fronts) {
  const edges = [];
  for (const front of fronts) {
    if (front === 'n') edges.push({ a: { x: box.x0, z: box.z0 }, b: { x: box.x1, z: box.z0 }, n: [0, -1], rot: Math.PI });
    if (front === 's') edges.push({ a: { x: box.x1, z: box.z1 }, b: { x: box.x0, z: box.z1 }, n: [0, 1], rot: 0 });
    if (front === 'w') {
      edges.push({ a: { x: box.x0, z: box.z1 }, b: { x: box.x0, z: box.z0 }, n: [-1, 0], rot: -Math.PI / 2 });
    }
    if (front === 'e') {
      edges.push({ a: { x: box.x1, z: box.z0 }, b: { x: box.x1, z: box.z1 }, n: [1, 0], rot: Math.PI / 2 });
    }
  }
  return edges;
}

function pickHeight(district, random) {
  const [low, high] = district.height;
  if (random.chance(district.tallChance)) return random.range(high * 0.55, high * 1.25);
  return random.range(low, Math.max(low + 4, high * 0.45));
}

function addStreetDressing(out, lot, box, ground, district, look, random) {
  for (const edge of frontEdges(box, lot.fronts)) {
    const length = Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z);
    const mid = { x: (edge.a.x + edge.b.x) / 2, z: (edge.a.z + edge.b.z) / 2 };
    const isShop = look.shop;
    if (isShop && random.chance(0.7) && length > 5) {
      out.awnings.push({
        x: mid.x + edge.n[0] * 0.02,
        y: ground.max + 3.3,
        z: mid.z + edge.n[1] * 0.02,
        rot: edge.rot,
        width: Math.min(length - 1.2, random.range(5, 14)),
        depth: random.range(1.4, 2.2),
        colour: random.pick(AWNING_COLOURS[district.id]),
      });
    }
    const signs = district.neonSigns;
    if (random.chance(Math.min(0.95, signs * 0.3))) {
      out.signs.push({
        kind: 'flat',
        x: mid.x + edge.n[0] * 0.08,
        y: ground.max + GROUND_STOREY - 0.2 + (look.tall ? GROUND_STOREY : 0),
        z: mid.z + edge.n[1] * 0.08,
        rot: edge.rot,
        width: Math.min(length * 0.7, random.range(4, 9)),
        district: district.id,
      });
    }
    if (random.chance(signs * 0.18) && length > 8) {
      const t = random.chance(0.5) ? 0.12 : 0.88;
      out.signs.push({
        kind: 'blade',
        x: edge.a.x + (edge.b.x - edge.a.x) * t + edge.n[0] * 0.9,
        y: ground.max + GROUND_STOREY + random.range(1.5, 5),
        z: edge.a.z + (edge.b.z - edge.a.z) * t + edge.n[1] * 0.9,
        rot: edge.rot + Math.PI / 2,
        width: 1.6,
        district: district.id,
      });
    }
  }
}

function buildWarehouse(builder, out, lot, box, ground, look, random) {
  const top = ground.max + random.range(7, 15);
  const doorTop = ground.max + 5.2;
  const doorLook = { ...look, tile: 'rollerDoor', storey: 5.2 + (ground.max - box.y0), vStart: 0, bay: 5 };
  addBox(builder, { ...box, y1: doorTop }, doorLook, null);
  const upper = { ...look, tile: random.pick(STYLES.warehouse.body), vStart: 0, storey: 4.2 };
  const roofBox = { ...box, y0: doorTop, y1: top };
  addBox(builder, roofBox, upper, 'roofMetal');
  addParapet(builder, roofBox, 0.7, 0.3, look);
  out.roofs.push({ ...inset(roofBox, 2), y: top, district: lot.district, kind: 'industrial' });
}

function buildTower(builder, out, lot, box, ground, district, style, look, random) {
  const height = pickHeight(district, random);
  look.tall = height > 45;
  const podiumStoreys = look.tall ? 2 : 1;
  const podiumTop = ground.max + GROUND_STOREY * podiumStoreys;
  const podiumSpan = podiumTop - box.y0;
  const groundTile = random.pick(style.ground);
  look.shop = groundTile.startsWith('shop') || groundTile === 'oldShop' || groundTile === 'decoGround';
  const podiumLook = { ...look, tile: groundTile, storey: GROUND_STOREY, vStart: alignTop(podiumSpan, GROUND_STOREY) };
  const usePodium = district.podiums || look.shop;
  const bodyInset = usePodium && look.tall ? random.range(1.5, 4) : usePodium ? random.range(0, 1.2) : 0;
  const bodyTile = random.pick(style.body);
  const floors = Math.max(1, Math.round((height - (podiumTop - ground.max)) / STOREY));
  const body = { ...inset(box, bodyInset), y0: podiumTop, y1: podiumTop + floors * STOREY };
  addBox(builder, { ...box, y1: podiumTop }, podiumLook, bodyInset > 0.3 ? 'roofGravel' : null);
  if (usePodium) addCornice(builder, box, podiumTop - 0.25, 0.55, 0.35, look);
  addBox(builder, body, { ...look, tile: bodyTile, storey: STOREY, vStart: 0 }, null);
  let roof = body;
  const roofStyle = style === STYLES.oldtown || (style === STYLES.stucco && random.chance(0.5)) ? 'gable' : 'flat';
  if (look.tall && random.chance(0.75)) {
    const setbackInset = random.range(2.5, Math.min(7, (body.x1 - body.x0) / 4));
    const setbackFloors = Math.max(2, Math.round(floors * random.range(0.12, 0.3)));
    const setback = { ...inset(body, setbackInset), y0: body.y1, y1: body.y1 + setbackFloors * STOREY };
    addBox(builder, { ...body, y0: body.y1, y1: body.y1 }, look, 'roofGravel');
    addParapet(builder, body, 1.1, 0.35, look);
    addBox(builder, setback, { ...look, tile: bodyTile, storey: STOREY, vStart: floors }, null);
    roof = setback;
    out.roofs.push({ ...inset(body, 1), y: body.y1, district: district.id, kind: 'ledge', hole: setback });
  }
  if (roofStyle === 'gable') {
    const ridge = addGableRoof(builder, roof, random.range(0.45, 0.65), 0.45, look);
    out.roofs.push({ ...roof, y: ridge, district: district.id, kind: 'gable' });
  } else {
    addBox(builder, { ...roof, y0: roof.y1, y1: roof.y1 }, look, 'roofGravel');
    const crown = look.tall && style === STYLES.glass && random.chance(0.6);
    if (crown) {
      const cap = { ...inset(roof, 1.2), y0: roof.y1, y1: roof.y1 + random.range(4, 9) };
      addBox(builder, cap, { ...look, tile: 'lobby', storey: cap.y1 - cap.y0, vStart: 0 }, 'roofMetal');
      out.roofs.push({ ...cap, y: cap.y1, district: district.id, kind: 'spire' });
    } else {
      addParapet(builder, roof, random.range(0.8, 1.3), 0.35, look);
      if (style !== STYLES.glass && style !== STYLES.office) addCornice(builder, roof, roof.y1 - 0.5, 0.6, 0.45, look);
      out.roofs.push({ ...inset(roof, 1.4), y: roof.y1, district: district.id, kind: look.tall ? 'tower' : 'flat' });
      if (district.id === 'beach' && random.chance(0.45)) {
        out.signs.push({
          kind: 'roof',
          x: (roof.x0 + roof.x1) / 2,
          y: roof.y1 + 0.9,
          z: lot.fronts.includes('n') ? roof.z0 + 0.6 : roof.z1 - 0.6,
          rot: lot.fronts.includes('n') ? Math.PI : 0,
          width: Math.min(roof.x1 - roof.x0 - 2, 12),
          district: district.id,
        });
      }
    }
  }
  addStreetDressing(out, lot, box, ground, district, look, random);
  return body.y1;
}

/**
 * Write every lot's building into `builder`; returns {colliders, awnings, signs, roofs, heights} for the
 * prop, sign and physics modules.
 */
export function buildBuildings(builder, layout, seed) {
  const out = { colliders: [], awnings: [], signs: [], roofs: [], tallest: 0 };
  layout.lots.forEach((lot, index) => {
    const random = createRandom(seed * 1009 + index * 31 + 7);
    const district = DISTRICT_BY_ID[lot.district];
    const styleName = random.pick(district.styles);
    const style = STYLES[styleName];
    const footprint = inset({ x0: lot.x0, z0: lot.z0, x1: lot.x1, z1: lot.z1 }, 0.35);
    const ground = groundRange(footprint);
    const box = { ...footprint, y0: ground.min - 0.8 };
    const look = {
      bay: style.bay,
      storey: STOREY,
      tint: rgb(random.pick(TINTS[styleName])),
      roofTint: rgb(random.pick(['#ffffff', '#e8e2da', '#d8d8dc'])),
      seed: random.next(),
    };
    let top;
    if (styleName === 'warehouse') {
      buildWarehouse(builder, out, lot, box, ground, look, random);
      top = ground.max + 12;
    } else {
      top = buildTower(builder, out, lot, box, ground, district, style, look, random);
    }
    out.tallest = Math.max(out.tallest, top);
    out.colliders.push({ x0: footprint.x0, z0: footprint.z0, x1: footprint.x1, z1: footprint.z1, top });
  });
  return out;
}

export { addWall };
