// The character rig: 17 joints, rest offsets for a 1.75 m figure, five builds and forward kinematics.
import * as THREE from '../../vendor/three.module.min.js';
import { PART, PART_NAMES } from '../palette.js';

/** Parent index per part (-1 for the root). Characters face +z; their left side is +x. */
export const PARENT = Object.freeze([
  -1, PART.pelvis, PART.abdomen, PART.torso, PART.neck,
  PART.torso, PART.upperArmL, PART.forearmL,
  PART.torso, PART.upperArmR, PART.forearmR,
  PART.pelvis, PART.thighL, PART.shinL,
  PART.pelvis, PART.thighR, PART.shinR,
]);

/** Joint offsets from the parent joint in metres; the pelvis offset is from the ground point. */
export const REST_OFFSET = Object.freeze([
  [0, 0.93, 0], [0, 0.07, 0], [0, 0.18, 0], [0, 0.26, -0.01], [0, 0.07, 0.01],
  [0.19, 0.205, -0.01], [0, -0.29, 0], [0, -0.25, 0],
  [-0.19, 0.205, -0.01], [0, -0.29, 0], [0, -0.25, 0],
  [0.095, -0.03, 0], [0, -0.43, 0], [0, -0.41, 0],
  [-0.095, -0.03, 0], [0, -0.43, 0], [0, -0.41, 0],
]);

export const HEAD_HEIGHT = 0.24;

/** Five builds: height factor, shoulder and hip width, limb and body girth, belly depth. */
export const BUILDS = Object.freeze([
  { name: 'slim', height: 1.0, shoulder: 0.93, hips: 0.95, girth: 0.88, belly: 0.92 },
  { name: 'average', height: 0.98, shoulder: 1.0, hips: 1.0, girth: 1.0, belly: 1.0 },
  { name: 'broad', height: 1.03, shoulder: 1.12, hips: 1.02, girth: 1.1, belly: 1.0 },
  { name: 'heavy', height: 0.97, shoulder: 1.08, hips: 1.12, girth: 1.18, belly: 1.32 },
  { name: 'petite', height: 0.92, shoulder: 0.9, hips: 1.04, girth: 0.9, belly: 0.94 },
]);

/** Per-part geometry scale [x, y, z] for a build. */
export function partScale(part, build) {
  const h = build.height;
  switch (part) {
    case PART.pelvis: return [build.hips, h, build.girth * Math.min(build.belly, 1.1)];
    case PART.abdomen: return [build.girth * (0.5 + build.belly * 0.5), h, build.belly];
    case PART.torso: return [build.shoulder * (0.6 + build.girth * 0.4), h, build.girth * (0.7 + build.belly * 0.3)];
    case PART.neck: return [build.girth, h, build.girth];
    case PART.head: return [1, 1, 1];
    default: return [build.girth, h, build.girth];
  }
}

function offsetFor(part, build) {
  const [x, y, z] = REST_OFFSET[part];
  const isShoulder = part === PART.upperArmL || part === PART.upperArmR;
  const isHip = part === PART.thighL || part === PART.thighR;
  const widthFactor = isShoulder ? build.shoulder : isHip ? build.hips : 1;
  return [x * widthFactor, y * build.height, z];
}

const tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const tempQuaternion = new THREE.Quaternion();
const tempPosition = new THREE.Vector3();
const unitScale = new THREE.Vector3(1, 1, 1);
const local = new THREE.Matrix4();
const scaled = new THREE.Matrix4();
const scaleMatrix = new THREE.Matrix4();

/**
 * Forward kinematics. `pose` holds 17 x 3 Euler angles (pitch x, yaw y, roll z) plus a root offset at index
 * 51..53. `root` is the character's world matrix. Writes 17 world joint matrices into `joints` and the
 * bone matrices (joint x build scale) into `out` as 3x4 rows (12 floats per bone).
 */
export function solvePose(pose, build, root, joints, out, outOffset = 0) {
  for (let part = 0; part < PART_NAMES.length; part += 1) {
    const offset = offsetFor(part, build);
    if (part === PART.pelvis) {
      offset[0] += pose[51];
      offset[1] += pose[52];
      offset[2] += pose[53];
    }
    tempPosition.set(offset[0], offset[1], offset[2]);
    tempEuler.set(pose[part * 3], pose[part * 3 + 1], pose[part * 3 + 2]);
    tempQuaternion.setFromEuler(tempEuler);
    local.compose(tempPosition, tempQuaternion, unitScale);
    const parent = PARENT[part];
    joints[part].multiplyMatrices(parent < 0 ? root : joints[parent], local);
    const s = partScale(part, build);
    scaleMatrix.makeScale(s[0], s[1], s[2]);
    scaled.multiplyMatrices(joints[part], scaleMatrix);
    const e = scaled.elements;
    const base = outOffset + part * 12;
    out[base] = e[0];
    out[base + 1] = e[4];
    out[base + 2] = e[8];
    out[base + 3] = e[12];
    out[base + 4] = e[1];
    out[base + 5] = e[5];
    out[base + 6] = e[9];
    out[base + 7] = e[13];
    out[base + 8] = e[2];
    out[base + 9] = e[6];
    out[base + 10] = e[10];
    out[base + 11] = e[14];
  }
}

export function createJointMatrices() {
  return PART_NAMES.map(() => new THREE.Matrix4());
}

export const POSE_SIZE = PART_NAMES.length * 3 + 3;
