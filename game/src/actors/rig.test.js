// Tests for the rig and animation: 17 parts, 1.75 m at about 7.3 heads, eased clip blending.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.min.js';
import { PART, PART_NAMES } from '../palette.js';
import { BUILDS, HEAD_HEIGHT, POSE_SIZE, createJointMatrices, solvePose } from './rig.js';
import { Animator } from './animation.js';

const average = BUILDS.find((b) => b.name === 'slim');

function restJoints(build) {
  const joints = createJointMatrices();
  const bones = new Float32Array(17 * 12);
  solvePose(new Float32Array(POSE_SIZE), build, new THREE.Matrix4(), joints, bones);
  return joints.map((m) => new THREE.Vector3().setFromMatrixPosition(m));
}

test('the rig has 17 parts', () => {
  assert.equal(PART_NAMES.length, 17);
});

test('a height-1.0 build stands 1.75 m tall at about 7.3 heads', () => {
  const joints = restJoints(average);
  const crown = joints[PART.head].y + HEAD_HEIGHT;
  assert.ok(Math.abs(crown - 1.75) < 0.01, `crown at ${crown.toFixed(3)}`);
  assert.ok(Math.abs(crown / HEAD_HEIGHT - 7.3) < 0.05);
  assert.ok(joints[PART.shoeL].y > 0.04 && joints[PART.shoeL].y < 0.08, 'ankles just above the ground');
  assert.ok(joints[PART.upperArmL].x > 0 && joints[PART.upperArmR].x < 0, 'left side is +x');
});

test('switching clips cross-fades with eased weights and keeps poses finite', () => {
  const animator = new Animator('idle');
  const pose = new Float32Array(POSE_SIZE);
  animator.play('run');
  animator.update(0.1, 5);
  assert.ok(animator.levels.run > 0 && animator.levels.run < 1 && animator.levels.idle > 0);
  for (let i = 0; i < 30; i += 1) animator.update(1 / 60, 5);
  assert.equal(animator.levels.run, 1);
  assert.equal(animator.levels.idle, 0);
  animator.sample(1.2, pose);
  assert.ok(pose.every(Number.isFinite));
  assert.notEqual(pose[PART.thighL * 3], 0, 'legs swing while running');
});
