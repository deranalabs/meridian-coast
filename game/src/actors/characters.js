// Character system: owns crowd rows, animators and poses, and uploads every character's bones each frame.
import * as THREE from '../../vendor/three.module.min.js';
import { createCrowd, BONE_FLOATS } from './crowdmesh.js';
import { Animator } from './animation.js';
import { solvePose, createJointMatrices, POSE_SIZE } from './rig.js';

const yAxis = new THREE.Vector3(0, 1, 0);

/** Holds up to `capacity` characters; add() returns a character whose position/heading/clip you drive. */
export function createCharacters(capacity, fabricTexture) {
  const crowd = createCrowd(capacity, fabricTexture);
  const characters = [];
  const bones = new Float32Array(BONE_FLOATS);
  const root = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const unit = new THREE.Vector3(1, 1, 1);

  for (let row = 0; row < capacity; row += 1) crowd.setVisible(row, false);

  return {
    mesh: crowd.mesh,
    characters,
    vertexCount: crowd.vertexCount,
    add(appearance, { clip = 'idle', phase = 0 } = {}) {
      if (characters.length >= capacity) return null;
      const row = characters.length;
      const character = {
        row,
        appearance,
        animator: new Animator(clip, phase),
        pose: new Float32Array(POSE_SIZE),
        joints: createJointMatrices(),
        position: new THREE.Vector3(),
        heading: 0,
        speed: 0,
        visible: true,
        play(name) {
          this.animator.play(name);
        },
      };
      crowd.setAppearance(row, appearance);
      crowd.setVisible(row, true);
      characters.push(character);
      return character;
    },
    update(dt, time) {
      for (const character of characters) {
        crowd.setVisible(character.row, character.visible);
        if (!character.visible) continue;
        character.animator.update(dt, character.speed);
        character.animator.sample(time, character.pose);
        quaternion.setFromAxisAngle(yAxis, character.heading);
        root.compose(character.position, quaternion, unit);
        solvePose(character.pose, character.appearance.build, root, character.joints, bones, 0);
        crowd.setBones(character.row, bones);
      }
      crowd.commit();
    },
  };
}
