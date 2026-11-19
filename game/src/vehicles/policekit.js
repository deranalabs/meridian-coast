// Police cruiser extras: two-tone door livery, roof light bar, push bar, spotlight and antenna geometry.
import * as THREE from '../../vendor/three.module.min.js';
import { composeMatrix as M } from '../core/meshbuilder.js';

/** Light-bar lens centres in car space (x, y, z) and colour, for the flashing beacons. */
export function lightBarLenses(spec) {
  const y = spec.roof + 0.13;
  const z = (spec.roofFront + spec.roofRear) / 2 + 0.05;
  return [
    { x: -0.42, y, z, colour: 'red' }, { x: -0.18, y, z, colour: 'red' },
    { x: 0.18, y, z, colour: 'blue' }, { x: 0.42, y, z, colour: 'blue' },
  ];
}

/** Add the cruiser kit to a car part list `p` (see carmodels.parts). */
export function addPoliceKit(p, spec) {
  const half = spec.length / 2;
  const w = spec.width / 2;
  const sill = spec.wheelRadius * 0.72;
  const doorLength = spec.frontAxle - spec.rearAxle - 0.95;
  const doorCentre = (spec.frontAxle + spec.rearAxle) / 2 + 0.05;
  for (const side of [-1, 1]) {
    p.add(new THREE.BoxGeometry(0.02, spec.belt - sill - 0.12, doorLength), M([side * (w + 0.012),
      (spec.belt + sill) / 2 + 0.02, doorCentre]), { colour: '#f3f1ea', rough: 0.3, metal: 0.2 });
    p.add(new THREE.BoxGeometry(0.024, 0.07, doorLength + 0.9), M([side * (w + 0.016), spec.belt - 0.2,
      doorCentre]), { colour: '#2f6bff', rough: 0.3, glow: 0.4 });
    p.add(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 5), M([side * (w + 0.024), spec.belt - 0.38,
      doorCentre + 0.25], [0, 0, Math.PI / 2]), { colour: '#d9b04a', rough: 0.25, metal: 1 });
  }
  const bar = lightBarLenses(spec);
  const barZ = bar[0].z;
  p.add(new THREE.BoxGeometry(1.24, 0.07, 0.3), M([0, spec.roof + 0.05, barZ]), { colour: '#141518', rough: 0.4 });
  for (const lens of bar) {
    const colour = lens.colour === 'red' ? '#ff2a4a' : '#2f6bff';
    p.add(new THREE.BoxGeometry(0.22, 0.1, 0.24), M([lens.x, lens.y, lens.z]), { colour, rough: 0.1, glow: 1.2 });
  }
  p.add(new THREE.BoxGeometry(0.1, 0.06, 0.2), M([0, spec.roof + 0.11, barZ]), { colour: '#f4f4ff', glow: 1.5 });
  p.add(new THREE.BoxGeometry(spec.width * 0.7, 0.32, 0.08), M([0, sill + 0.3, half + 0.16]),
    { colour: '#121316', rough: 0.5, metal: 0.4 });
  for (const side of [-1, 1]) {
    p.add(new THREE.BoxGeometry(0.07, 0.5, 0.2), M([side * 0.45, sill + 0.36, half + 0.08]),
      { colour: '#121316', rough: 0.5, metal: 0.4 });
  }
  p.add(new THREE.CylinderGeometry(0.07, 0.06, 0.12, 10), M([-w - 0.02, spec.belt + 0.12, spec.glassFront - 0.25],
    [Math.PI / 2, 0, 0]), { colour: '#d8dce2', rough: 0.2, metal: 1 });
  p.add(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 4), M([0.4, spec.roof + 0.3, spec.roofRear - 0.1]),
    { colour: '#0c0c0e', rough: 0.5 });
}
