// Action clips: limp (ragdoll), cower, cover crouch, phone filming and calling, punch and stagger poses.
import { PART } from '../palette.js';

function set(pose, part, pitch, yaw = 0, roll = 0) {
  pose[part * 3] = pitch;
  pose[part * 3 + 1] = yaw;
  pose[part * 3 + 2] = roll;
}

function squat(pose, depth, lean) {
  set(pose, PART.pelvis, -0.1, 0, 0);
  set(pose, PART.abdomen, lean * 0.5, 0, 0);
  set(pose, PART.torso, lean * 0.5, 0, 0);
  set(pose, PART.thighL, -1.75 * depth, 0.15, 0.12);
  set(pose, PART.thighR, -1.6 * depth, -0.15, -0.12);
  set(pose, PART.shinL, 2.0 * depth);
  set(pose, PART.shinR, 1.9 * depth);
  set(pose, PART.shoeL, -0.35 * depth);
  set(pose, PART.shoeR, -0.35 * depth);
  pose[52] = -0.5 * depth;
}

function standing(pose) {
  set(pose, PART.thighL, -0.03, 0.06, 0.05);
  set(pose, PART.thighR, 0.03, -0.06, -0.05);
  set(pose, PART.shinL, 0.05);
  set(pose, PART.shinR, 0.05);
}

/** Every clip has the signature (pose, phase, time); one-shots get phase 0..1. */
export const ACTION_CLIPS = {
  limp(pose, phase, time) {
    set(pose, PART.abdomen, 0.05, 0.1, 0.05);
    set(pose, PART.neck, 0.1, 0.4, 0.1);
    set(pose, PART.head, 0.2, 0.3, 0.2);
    set(pose, PART.upperArmL, -0.4, 0.2, 1.25);
    set(pose, PART.upperArmR, -0.2, -0.1, -1.1);
    set(pose, PART.forearmL, -0.5, 0, 0);
    set(pose, PART.forearmR, -0.25, 0, 0);
    set(pose, PART.thighL, -0.2, 0.1, 0.18);
    set(pose, PART.thighR, 0.1, -0.1, -0.12);
    set(pose, PART.shinL, 0.5);
    set(pose, PART.shinR, 0.15);
    set(pose, PART.shoeL, 0.4);
    set(pose, PART.shoeR, 0.5);
  },
  cower(pose, phase, time) {
    squat(pose, 0.95, 0.75);
    const shake = Math.sin(time * 31) * 0.025;
    set(pose, PART.neck, 0.45 + shake, 0, 0);
    set(pose, PART.head, 0.25, 0, 0);
    set(pose, PART.upperArmL, -2.45 + shake, 0.25, 0.25);
    set(pose, PART.upperArmR, -2.45 - shake, -0.25, -0.25);
    set(pose, PART.forearmL, -1.9, 0, 0);
    set(pose, PART.forearmR, -1.9, 0, 0);
  },
  crouch(pose, phase, time) {
    squat(pose, 0.82, 0.32);
    set(pose, PART.neck, -0.1, 0.1, 0);
    set(pose, PART.head, -0.05, 0.15 + Math.sin(time * 0.8) * 0.05, 0);
    set(pose, PART.upperArmR, -0.9, 0.2, -0.15);
    set(pose, PART.forearmR, -0.9, 0, 0);
    set(pose, PART.upperArmL, -0.7, -0.35, 0.1);
    set(pose, PART.forearmL, -1.2, 0, 0);
  },
  film(pose, phase, time) {
    standing(pose);
    set(pose, PART.torso, -0.04, 0, 0);
    set(pose, PART.neck, 0.12, 0, 0);
    set(pose, PART.head, 0.05, Math.sin(time * 0.7) * 0.05, 0);
    set(pose, PART.upperArmR, -1.05, 0.38, -0.15);
    set(pose, PART.forearmR, -1.05, 0, 0);
    set(pose, PART.handR, -0.2, 0, 0);
    set(pose, PART.upperArmL, -0.95, -0.3, 0.1);
    set(pose, PART.forearmL, -1.15, 0, 0);
  },
  call(pose, phase, time) {
    standing(pose);
    set(pose, PART.neck, 0.05, Math.sin(time * 0.9) * 0.25, 0.08);
    set(pose, PART.upperArmR, -0.35, 0.2, -0.55);
    set(pose, PART.forearmR, -2.45, 0, 0);
    set(pose, PART.handR, 0.3, 0, 0);
    set(pose, PART.upperArmL, 0.05, 0, 0.12);
    set(pose, PART.forearmL, -0.25, 0, 0);
    set(pose, PART.pelvis, 0, 0, Math.sin(time * 0.6) * 0.04);
  },
  punch(pose, phase, time) {
    standing(pose);
    const out = Math.sin(Math.min(1, phase * 1.6) * Math.PI);
    set(pose, PART.pelvis, 0, -0.25 * out, 0);
    set(pose, PART.torso, 0.15 * out, -0.45 * out + 0.2, 0);
    set(pose, PART.upperArmL, -1.0, -0.25, 0.2);
    set(pose, PART.forearmL, -2.0, 0, 0);
    set(pose, PART.upperArmR, -0.8 - 0.75 * out, 0.1, -0.1);
    set(pose, PART.forearmR, -2.0 + 1.9 * out, 0, 0);
    set(pose, PART.thighL, -0.35, 0, 0.05);
    set(pose, PART.shinL, 0.25);
  },
  stagger(pose, phase, time) {
    standing(pose);
    const reel = Math.sin(Math.min(1, phase) * Math.PI);
    set(pose, PART.abdomen, -0.25 * reel, 0.2 * reel, 0);
    set(pose, PART.torso, -0.3 * reel, 0.25 * reel, 0.1 * reel);
    set(pose, PART.neck, -0.3 * reel, 0, 0);
    set(pose, PART.upperArmL, -0.6 * reel, 0, 0.9 * reel);
    set(pose, PART.upperArmR, -0.4 * reel, 0, -0.8 * reel);
    set(pose, PART.forearmL, -0.6, 0, 0);
    set(pose, PART.forearmR, -0.6, 0, 0);
    set(pose, PART.thighR, 0.35 * reel);
    set(pose, PART.shinR, 0.3 * reel);
  },
};

/** Clips whose phase is a one-shot 0..1 progress instead of the gait cycle, with their length in seconds. */
export const ONE_SHOT_CLIPS = new Map([['enter', 0.9], ['exit', 0.9], ['punch', 0.4], ['stagger', 0.55]]);
