// Held props: pistol, SMG, shotgun and phone models, instanced on each character's right hand joint.
import * as THREE from '../../vendor/three.module.min.js';
import { mergeGeometries, composeMatrix as M } from '../core/meshbuilder.js';
import { createCarMaterial } from '../vehicles/carmaterial.js';
import { PART } from '../palette.js';

const NAMES = ['position', 'normal', 'aTrim', 'aPaint', 'aSurface', 'aGlow'];
const GUNMETAL = { colour: '#1c1e22', rough: 0.35, metal: 0.8 };
const POLYMER = { colour: '#2a2b2e', rough: 0.7, metal: 0 };

function build(pieces) {
  const list = [];
  const constants = [];
  for (const [geometry, matrix, look] of pieces) {
    geometry.deleteAttribute('uv');
    geometry.applyMatrix4(matrix);
    list.push(geometry);
    const c = new THREE.Color(look.colour);
    constants.push({ aTrim: [c.r, c.g, c.b], aPaint: 0, aSurface: [look.rough, look.metal], aGlow: look.glow ?? 0 });
  }
  return mergeGeometries(list, NAMES, constants);
}

const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

/** Hand space: the barrel runs along -y (forward when the arm is raised), +z is up the back of the hand. */
const MODELS = {
  pistol: () => build([
    [box(0.032, 0.19, 0.042), M([0, -0.12, 0.045]), GUNMETAL],
    [box(0.03, 0.05, 0.11), M([0, -0.06, -0.01], [0.25, 0, 0]), POLYMER],
    [box(0.012, 0.012, 0.012), M([0, -0.205, 0.07]), { colour: '#d8dce2', rough: 0.3, metal: 1 }],
  ]),
  smg: () => build([
    [box(0.045, 0.3, 0.07), M([0, -0.15, 0.05]), GUNMETAL],
    [box(0.026, 0.045, 0.16), M([0, -0.17, -0.06]), POLYMER],
    [box(0.03, 0.05, 0.1), M([0, -0.05, -0.02], [0.2, 0, 0]), POLYMER],
    [new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), M([0, -0.34, 0.06]), GUNMETAL],
    [box(0.03, 0.18, 0.03), M([0, 0.07, 0.05]), POLYMER],
  ]),
  shotgun: () => build([
    [box(0.045, 0.66, 0.05), M([0, -0.26, 0.06]), GUNMETAL],
    [box(0.05, 0.2, 0.06), M([0, -0.3, 0.015]), { colour: '#5a3a22', rough: 0.6, metal: 0 }],
    [box(0.045, 0.26, 0.09), M([0, 0.12, 0.03], [-0.15, 0, 0]), { colour: '#5a3a22', rough: 0.6, metal: 0 }],
    [box(0.03, 0.05, 0.09), M([0, -0.04, -0.01], [0.2, 0, 0]), POLYMER],
  ]),
  phone: () => build([
    [box(0.075, 0.15, 0.012), M([0, -0.09, 0.04]), { colour: '#18181c', rough: 0.3, metal: 0.4 }],
    [box(0.066, 0.135, 0.002), M([0, -0.09, 0.047]), { colour: '#9fd8ff', rough: 0.1, metal: 0, glow: 2.2 }],
    [box(0.066, 0.135, 0.002), M([0, -0.09, 0.033]), { colour: '#c7d0ff', rough: 0.1, metal: 0, glow: 0.8 }],
  ]),
};

export const PROP_NAMES = Object.keys(MODELS);

/** One instanced mesh per prop; update(characters) puts each character's `held` prop in its right hand. */
export function createHeldProps(capacity, noiseTexture) {
  const group = new THREE.Group();
  group.name = 'held-props';
  const material = createCarMaterial(noiseTexture, 1);
  const meshes = {};
  for (const name of PROP_NAMES) {
    const mesh = new THREE.InstancedMesh(MODELS[name](), material, capacity);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.setColorAt(0, new THREE.Color('#ffffff'));
    mesh.name = `held-${name}`;
    meshes[name] = mesh;
    group.add(mesh);
  }
  return {
    group,
    update(characters) {
      for (const name of PROP_NAMES) meshes[name].count = 0;
      for (const character of characters) {
        const mesh = character.visible && character.held ? meshes[character.held] : null;
        if (!mesh || mesh.count >= capacity) continue;
        mesh.setMatrixAt(mesh.count, character.joints[PART.handR]);
        mesh.count += 1;
      }
      for (const name of PROP_NAMES) {
        meshes[name].instanceMatrix.needsUpdate = true;
        meshes[name].visible = meshes[name].count > 0;
      }
    },
  };
}
