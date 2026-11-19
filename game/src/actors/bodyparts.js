// Body part shapes as loft profiles in joint space: head with face details, torso, limbs and hands.
import * as THREE from '../../vendor/three.module.min.js';
import { loft } from './loft.js';
import { PART, SLOT, COLOUR } from '../palette.js';
import { composeMatrix } from '../core/meshbuilder.js';

/** Ring profiles [y, rx, rz, cx, cz, flatten] per part; wardrobe garments inflate these. */
export const PROFILES = Object.freeze({
  pelvis: [[-0.12, 0.12, 0.085, 0, 0.004], [-0.07, 0.15, 0.098], [0.0, 0.158, 0.1, 0, -0.004], [0.075, 0.144, 0.093]],
  abdomen: [[-0.01, 0.142, 0.092], [0.09, 0.137, 0.095, 0, 0.006], [0.19, 0.15, 0.1, 0, 0.004]],
  torso: [[-0.01, 0.15, 0.1, 0, 0.004], [0.08, 0.166, 0.11, 0, 0.012], [0.15, 0.182, 0.114, 0, 0.012],
    [0.205, 0.19, 0.104, 0, 0.002], [0.24, 0.16, 0.088], [0.272, 0.075, 0.062, 0, 0.004]],
  neck: [[-0.01, 0.055, 0.056], [0.05, 0.05, 0.052, 0, 0.004], [0.09, 0.048, 0.05, 0, 0.008]],
  head: [[0.0, 0.035, 0.04, 0, 0.03], [0.025, 0.062, 0.07, 0, 0.018], [0.065, 0.078, 0.092, 0, 0.008],
    [0.12, 0.087, 0.101, 0, 0.002], [0.17, 0.088, 0.102, 0, -0.004], [0.205, 0.076, 0.088, 0, -0.008],
    [0.228, 0.05, 0.06, 0, -0.008], [0.24, 0.012, 0.016, 0, -0.008]],
  upperArm: [[0.01, 0.05, 0.054], [-0.04, 0.057, 0.06], [-0.15, 0.05, 0.053], [-0.26, 0.043, 0.046],
    [-0.295, 0.04, 0.043]],
  forearm: [[0.01, 0.042, 0.044], [-0.07, 0.047, 0.047, 0, -0.004], [-0.19, 0.035, 0.037], [-0.255, 0.029, 0.033]],
  hand: [[0.0, 0.021, 0.03], [-0.04, 0.02, 0.043], [-0.1, 0.017, 0.046], [-0.15, 0.014, 0.038], [-0.18, 0.008, 0.02]],
  thigh: [[0.02, 0.083, 0.086], [-0.08, 0.084, 0.087, 0, 0.004], [-0.25, 0.068, 0.071], [-0.4, 0.053, 0.057],
    [-0.435, 0.05, 0.053]],
  shin: [[0.01, 0.05, 0.053], [-0.1, 0.055, 0.06, 0, -0.014], [-0.25, 0.043, 0.046, 0, -0.004],
    [-0.39, 0.034, 0.036], [-0.415, 0.034, 0.036]],
});

/** A body piece: geometry plus the bone it follows, its wardrobe slot/variant, colour channel and surface. */
export function piece(geometry, bone, slot, variant, channel, rough = 0.6, metal = 0) {
  return { geometry, bone, slot, variant, channel, rough, metal };
}

function placed(geometry, position, rotation = [0, 0, 0], scale = 1) {
  geometry.applyMatrix4(composeMatrix(position, rotation, scale));
  return geometry;
}

function faceDetails(pieces) {
  const body = SLOT.body;
  const nose = loft([[0, 0.012, 0.012], [-0.035, 0.016, 0.02, 0, 0.012], [-0.045, 0.012, 0.014, 0, 0.008]],
    { segments: 6 });
  pieces.push(piece(placed(nose, [0, 0.145, 0.088], [0.25, 0, 0]), PART.head, body, 0, COLOUR.skin, 0.5));
  for (const side of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.022, 6, 5);
    pieces.push(piece(placed(ear, [side * 0.086, 0.125, -0.005], [0, 0, 0], [0.45, 1.1, 0.8]), PART.head, body, 0,
      COLOUR.skin, 0.55));
    const eye = new THREE.SphereGeometry(0.0115, 6, 4);
    pieces.push(piece(placed(eye, [side * 0.031, 0.137, 0.091], [0, 0, 0], [1.3, 0.8, 0.6]), PART.head, body, 0,
      COLOUR.detail, 0.15));
    const brow = new THREE.BoxGeometry(0.03, 0.007, 0.01);
    pieces.push(piece(placed(brow, [side * 0.032, 0.157, 0.094], [0, side * 0.2, side * -0.12]), PART.head, body, 0,
      COLOUR.hair, 0.8));
  }
  const mouth = new THREE.BoxGeometry(0.03, 0.005, 0.008);
  pieces.push(piece(placed(mouth, [0, 0.083, 0.088]), PART.head, body, 0, COLOUR.detail, 0.4));
}

function hand(side) {
  const palm = loft(PROFILES.hand, { segments: 8 });
  const thumb = loft([[0, 0.012, 0.012], [-0.04, 0.011, 0.011], [-0.065, 0.007, 0.008]], { segments: 6 });
  placed(thumb, [-side * 0.006, -0.03, 0.03], [0.5, 0, side * 0.35]);
  return [palm, thumb];
}

/** All skin pieces of the body (shoes and hair come from the wardrobe). */
export function buildBodyPieces() {
  const body = SLOT.body;
  const pieces = [];
  const skin = (geometry, bone) => pieces.push(piece(geometry, bone, body, 0, COLOUR.skin, 0.55));
  skin(loft(PROFILES.pelvis, { segments: 12 }), PART.pelvis);
  skin(loft(PROFILES.abdomen, { segments: 12, capStart: false, capEnd: false }), PART.abdomen);
  skin(loft(PROFILES.torso, { segments: 14 }), PART.torso);
  skin(loft(PROFILES.neck, { segments: 10 }), PART.neck);
  skin(loft(PROFILES.head, { segments: 14 }), PART.head);
  faceDetails(pieces);
  const sides = [[PART.upperArmL, PART.forearmL, PART.handL, 1], [PART.upperArmR, PART.forearmR, PART.handR, -1]];
  for (const [upper, fore, palm, side] of sides) {
    skin(loft(PROFILES.upperArm, { segments: 10 }), upper);
    skin(placed(new THREE.SphereGeometry(0.058, 8, 6), [0, -0.01, 0]), upper);
    skin(loft(PROFILES.forearm, { segments: 10 }), fore);
    for (const geometry of hand(side)) skin(geometry, palm);
  }
  for (const [thigh, shin] of [[PART.thighL, PART.shinL], [PART.thighR, PART.shinR]]) {
    skin(loft(PROFILES.thigh, { segments: 12 }), thigh);
    skin(loft(PROFILES.shin, { segments: 10 }), shin);
  }
  return pieces;
}
