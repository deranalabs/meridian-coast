// Car geometry: coupe, sedan and pickup from extruded side profiles with arches, glass, lights and trim.
import * as THREE from '../../vendor/three.module.min.js';
import { mergeGeometries, composeMatrix } from '../core/meshbuilder.js';
import { addPoliceKit } from './policekit.js';

/** Dimensions in metres; z is forward. Axle positions are from the car's centre. */
export const CAR_TYPES = {
  coupe: {
    name: 'Juno Kestrel GT', length: 4.42, width: 1.88, wheelRadius: 0.34, frontAxle: 1.32, rearAxle: -1.26,
    track: 0.8, belt: 0.86, roof: 1.27, hood: 0.78, deck: 0.84, glassFront: 0.62, roofFront: 0.05, roofRear: -0.98,
    glassRear: -1.62, maxSpeed: 58, accel: 13, grip: 7.5,
  },
  sedan: {
    name: 'Calloway Meridia', length: 4.82, width: 1.86, wheelRadius: 0.33, frontAxle: 1.42, rearAxle: -1.4,
    track: 0.79, belt: 0.95, roof: 1.46, hood: 0.88, deck: 0.94, glassFront: 0.9, roofFront: 0.32, roofRear: -0.98,
    glassRear: -1.6, maxSpeed: 48, accel: 10, grip: 6.8,
  },
  pickup: {
    name: 'Brava Tradesman', length: 5.3, width: 1.98, wheelRadius: 0.4, frontAxle: 1.68, rearAxle: -1.56,
    track: 0.85, belt: 1.12, roof: 1.84, hood: 1.08, deck: 1.1, glassFront: 1.0, roofFront: 0.62, roofRear: -0.3,
    glassRear: -0.42, bed: true, maxSpeed: 44, accel: 9, grip: 6.0,
  },
  cruiser: {
    name: 'Calloway Interceptor', length: 4.9, width: 1.9, wheelRadius: 0.34, frontAxle: 1.44, rearAxle: -1.42,
    track: 0.8, belt: 0.95, roof: 1.46, hood: 0.88, deck: 0.94, glassFront: 0.9, roofFront: 0.32, roofRear: -0.98,
    glassRear: -1.6, police: true, maxSpeed: 52, accel: 12.5, grip: 7.4,
  },
};

export const TYPE_NAMES = Object.keys(CAR_TYPES);
const NAMES = ['position', 'normal', 'aTrim', 'aPaint', 'aSurface', 'aGlow'];

function parts() {
  const list = [];
  const constants = [];
  return {
    add(geometry, matrix, { colour = '#ffffff', paint = 0, rough = 0.5, metal = 0, glow = 0 } = {}) {
      if (geometry.attributes.uv) geometry.deleteAttribute('uv');
      if (matrix) geometry.applyMatrix4(matrix);
      if (!geometry.attributes.normal) geometry.computeVertexNormals();
      list.push(geometry);
      const c = new THREE.Color(colour);
      constants.push({ aTrim: [c.r, c.g, c.b], aPaint: paint, aSurface: [rough, metal], aGlow: glow });
    },
    build() {
      return mergeGeometries(list, NAMES, constants);
    },
  };
}

/** Extrude a side profile (shape x = forward, y = up) across `width`, centred on x = 0. */
function extrudeSide(shape, width, bevel) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, width - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 10,
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2 - bevel, 0, 0);
  return geometry;
}

function bodyProfile(spec) {
  const half = spec.length / 2;
  const r = spec.wheelRadius;
  const arch = r + 0.07;
  const sill = r * 0.72;
  const s = new THREE.Shape();
  s.moveTo(-half + 0.06, sill + 0.05);
  s.lineTo(spec.rearAxle - arch, sill);
  s.absarc(spec.rearAxle, r, arch, Math.PI + 0.25, -0.25, true);
  s.lineTo(spec.frontAxle - arch, sill);
  s.absarc(spec.frontAxle, r, arch, Math.PI + 0.25, -0.25, true);
  s.lineTo(half - 0.08, sill + 0.06);
  s.quadraticCurveTo(half + 0.02, sill + 0.1, half, spec.hood - 0.18);
  s.quadraticCurveTo(half - 0.02, spec.hood, half - 0.32, spec.hood);
  if (spec.bed) {
    s.lineTo(spec.glassFront + 0.05, spec.belt);
    s.lineTo(spec.glassRear - 0.06, spec.belt);
    s.lineTo(spec.glassRear - 0.06, spec.belt - 0.38);
    s.lineTo(-half + 0.12, spec.belt - 0.38);
  } else {
    s.lineTo(spec.glassFront + 0.1, spec.belt);
    s.lineTo(spec.glassRear - 0.05, spec.belt);
    s.quadraticCurveTo(-half + 0.1, spec.deck + 0.02, -half + 0.02, spec.deck - 0.08);
  }
  s.quadraticCurveTo(-half - 0.02, sill + 0.3, -half + 0.06, sill + 0.05);
  return s;
}

function greenhouseProfile(spec) {
  const s = new THREE.Shape();
  s.moveTo(spec.glassFront, spec.belt - 0.02);
  s.lineTo(spec.roofFront, spec.roof - 0.02);
  s.quadraticCurveTo((spec.roofFront + spec.roofRear) / 2, spec.roof + 0.03, spec.roofRear, spec.roof - 0.02);
  s.lineTo(spec.glassRear, spec.belt - 0.02);
  s.closePath();
  return s;
}

function roofProfile(spec) {
  const s = new THREE.Shape();
  const lift = 0.025;
  s.moveTo(spec.roofFront + 0.05, spec.roof - 0.06);
  s.quadraticCurveTo((spec.roofFront + spec.roofRear) / 2, spec.roof + 0.035 + lift, spec.roofRear - 0.04,
    spec.roof - 0.06);
  s.lineTo(spec.roofRear + 0.02, spec.roof - 0.1);
  s.lineTo(spec.roofFront, spec.roof - 0.1);
  s.closePath();
  return s;
}

const M = (p, r, s) => composeMatrix(p, r, s);

function lights(p, spec) {
  const half = spec.length / 2;
  const w = spec.width / 2;
  const front = half + 0.03;
  const rear = -half - 0.07;
  for (const side of [-1, 1]) {
    p.add(new THREE.BoxGeometry(0.4, 0.16, 0.12), M([side * (w - 0.32), spec.hood - 0.22, front - 0.04]),
      { colour: '#1a1c20', rough: 0.3, metal: 0.6 });
    p.add(new THREE.BoxGeometry(0.34, 0.1, 0.04), M([side * (w - 0.32), spec.hood - 0.22, front + 0.02]),
      { colour: '#fff4dc', glow: 9, rough: 0.1 });
    p.add(new THREE.BoxGeometry(0.42, 0.03, 0.04), M([side * (w - 0.33), spec.hood - 0.13, front + 0.01]),
      { colour: '#dff0ff', glow: 6 });
    const tailY = spec.bed ? spec.belt - 0.22 : spec.deck - 0.16;
    p.add(new THREE.BoxGeometry(0.48, 0.17, 0.08), M([side * (w - 0.3), tailY, rear + 0.03]),
      { colour: '#2a0a0e', rough: 0.2, metal: 0.4 });
    p.add(new THREE.BoxGeometry(0.42, 0.11, 0.03), M([side * (w - 0.3), tailY, rear - 0.015]),
      { colour: '#ff2234', glow: 5, rough: 0.2 });
  }
  if (!spec.bed) {
    p.add(new THREE.BoxGeometry(spec.width - 1.1, 0.035, 0.03), M([0, spec.deck - 0.13, rear - 0.01]),
      { colour: '#ff2234', glow: 3.5 });
    p.add(new THREE.BoxGeometry(spec.width - 0.5, 0.05, 0.16), M([0, spec.deck + 0.03, -half + 0.12]),
      { paint: 1, rough: 0.3, metal: 0.45 });
  }
}

function trim(p, spec) {
  const half = spec.length / 2;
  const w = spec.width / 2;
  const sill = spec.wheelRadius * 0.72;
  p.add(new THREE.BoxGeometry(spec.width + 0.02, 0.2, 0.22), M([0, sill + 0.08, half - 0.06]),
    { colour: '#18191c', rough: 0.6 });
  p.add(new THREE.BoxGeometry(spec.width + 0.02, 0.2, 0.22), M([0, sill + 0.1, -half + 0.02]),
    { colour: '#18191c', rough: 0.6 });
  for (let k = -2; k <= 2; k += 1) {
    p.add(new THREE.BoxGeometry(0.03, 0.1, 0.18), M([k * 0.22, sill + 0.02, -half - 0.02]),
      { colour: '#0c0d0f', rough: 0.5 });
  }
  p.add(new THREE.BoxGeometry(spec.width * 0.42, 0.16, 0.06), M([0, spec.hood - 0.24, half + 0.0]),
    { colour: '#0d0e10', rough: 0.4, metal: 0.6 });
  p.add(new THREE.BoxGeometry(0.52, 0.12, 0.02), M([0, sill + 0.2, half + 0.06]), { colour: '#f4f1e6', rough: 0.4 });
  p.add(new THREE.BoxGeometry(0.52, 0.12, 0.02), M([0, sill + 0.3, -half - 0.1]), { colour: '#f4f1e6', rough: 0.4 });
  for (const side of [-1, 1]) {
    p.add(new THREE.BoxGeometry(0.04, 0.12, spec.length * 0.55), M([side * (w + 0.005), sill + 0.06, 0]),
      { colour: '#141518', rough: 0.6 });
    p.add(new THREE.BoxGeometry(0.16, 0.1, 0.18), M([side * (w + 0.05), spec.belt + 0.08, spec.glassFront - 0.08]),
      { paint: 1, rough: 0.3, metal: 0.5 });
    p.add(new THREE.BoxGeometry(0.02, 0.025, 0.14), M([side * (w + 0.005), spec.belt - 0.12, spec.glassFront - 0.7]),
      { colour: '#c8ccd2', rough: 0.2, metal: 1 });
  }
  p.add(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), M([w - 0.4, sill, -half - 0.02], [Math.PI / 2, 0, 0]),
    { colour: '#9aa0a6', rough: 0.25, metal: 1 });
}

function pillars(p, spec, glassWidth) {
  const gw = glassWidth / 2 + 0.006;
  const midZ = (spec.glassFront + spec.glassRear) / 2 + 0.1;
  const height = spec.roof - spec.belt;
  for (const side of [-1, 1]) {
    p.add(new THREE.BoxGeometry(0.012, height * 0.95, 0.09), M([side * gw, spec.belt + height * 0.45, midZ]),
      { colour: '#111214', rough: 0.4 });
    p.add(new THREE.BoxGeometry(0.014, 0.035, Math.abs(spec.glassFront - spec.glassRear)),
      M([side * gw, spec.belt + 0.005, (spec.glassFront + spec.glassRear) / 2]),
      { colour: '#c8ccd2', rough: 0.2, metal: 1 });
  }
}

function bed(p, spec) {
  const half = spec.length / 2;
  const w = spec.width / 2;
  const floor = spec.belt - 0.38;
  const bedLength = spec.glassRear - 0.06 - (-half + 0.12);
  const bedCentre = (spec.glassRear - 0.06 + (-half + 0.12)) / 2;
  for (const side of [-1, 1]) {
    p.add(new THREE.BoxGeometry(0.08, 0.42, bedLength), M([side * (w - 0.06), floor + 0.2, bedCentre]),
      { paint: 1, rough: 0.35, metal: 0.4 });
    p.add(new THREE.BoxGeometry(0.11, 0.04, bedLength), M([side * (w - 0.06), floor + 0.42, bedCentre]),
      { colour: '#1a1b1e', rough: 0.6 });
  }
  p.add(new THREE.BoxGeometry(spec.width - 0.1, 0.44, 0.07), M([0, floor + 0.2, -half + 0.08]),
    { paint: 1, rough: 0.35, metal: 0.4 });
  p.add(new THREE.BoxGeometry(spec.width - 0.24, 0.02, bedLength - 0.1), M([0, floor + 0.01, bedCentre]),
    { colour: '#202124', rough: 0.9 });
}

/** One merged geometry per car type (everything except wheels). */
export function buildCarGeometry(typeName) {
  const spec = CAR_TYPES[typeName];
  const p = parts();
  p.add(extrudeSide(bodyProfile(spec), spec.width, 0.09), null, { paint: 1, rough: 0.32, metal: 0.45 });
  const glassWidth = spec.width * 0.86;
  p.add(extrudeSide(greenhouseProfile(spec), glassWidth, 0.05), null, { colour: '#0b0f16', rough: 0.04, metal: 0.9 });
  p.add(extrudeSide(roofProfile(spec), glassWidth + 0.03, 0.03), null, { paint: 1, rough: 0.3, metal: 0.45 });
  pillars(p, spec, glassWidth);
  lights(p, spec);
  trim(p, spec);
  if (spec.bed) bed(p, spec);
  if (spec.police) addPoliceKit(p, spec);
  return p.build();
}

/** A wheel (tyre, five-spoke rim, brake disc) with its axle along x, centred at the origin. */
export function buildWheelGeometry() {
  const p = parts();
  const profile = [[0.2, -0.11], [0.31, -0.115], [0.335, -0.09], [0.34, 0], [0.335, 0.09], [0.31, 0.115],
    [0.2, 0.11]].map(([r, y]) => new THREE.Vector2(r, y));
  const tyre = new THREE.LatheGeometry(profile, 14);
  p.add(tyre, M([0, 0, 0], [0, 0, Math.PI / 2]), { colour: '#141416', rough: 0.85 });
  p.add(new THREE.CylinderGeometry(0.215, 0.215, 0.2, 14, 1, true), M([0, 0, 0], [0, 0, Math.PI / 2]),
    { colour: '#2a2c30', rough: 0.4, metal: 0.8 });
  p.add(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 10), M([0.08, 0, 0], [0, 0, Math.PI / 2]),
    { colour: '#d8dce2', rough: 0.15, metal: 1 });
  for (let k = 0; k < 5; k += 1) {
    const angle = (k / 5) * Math.PI * 2;
    p.add(new THREE.BoxGeometry(0.03, 0.17, 0.05),
      M([0.075, Math.cos(angle) * 0.12, Math.sin(angle) * 0.12], [-angle, 0, 0]),
      { colour: '#c8ccd2', rough: 0.2, metal: 1 });
  }
  p.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12, 1), M([0.06, 0, 0], [0, 0, Math.PI / 2]),
    { colour: '#9a9c9e', rough: 0.3, metal: 0.9 });
  p.add(new THREE.TorusGeometry(0.205, 0.014, 4, 14), M([0.095, 0, 0], [0, Math.PI / 2, 0]),
    { colour: '#d8dce2', rough: 0.2, metal: 1 });
  return p.build();
}
