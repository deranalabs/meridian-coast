// Animation: procedural clips (idle, walk, run, aim, flee, sit, enter and exit car) and an eased blender.
import { PART } from '../palette.js';
import { POSE_SIZE } from './rig.js';
import { ACTION_CLIPS, ONE_SHOT_CLIPS } from './actionclips.js';

const TAU = Math.PI * 2;

function set(pose, part, pitch, yaw = 0, roll = 0) {
  pose[part * 3] = pitch;
  pose[part * 3 + 1] = yaw;
  pose[part * 3 + 2] = roll;
}

function relaxedArms(pose, swing, elbow, spread = 0.09) {
  set(pose, PART.upperArmL, swing, 0, spread);
  set(pose, PART.upperArmR, -swing, 0, -spread);
  set(pose, PART.forearmL, elbow, 0, 0);
  set(pose, PART.forearmR, elbow, 0, 0);
  set(pose, PART.handL, 0.1, 0, 0.05);
  set(pose, PART.handR, 0.1, 0, -0.05);
}

function gait(pose, phase, amp) {
  const s = Math.sin(phase * TAU);
  const c = Math.cos(phase * TAU);
  set(pose, PART.thighL, -amp.thigh * s);
  set(pose, PART.thighR, amp.thigh * s);
  const kneeL = amp.kneeBase + amp.knee * Math.max(0, c);
  const kneeR = amp.kneeBase + amp.knee * Math.max(0, -c);
  set(pose, PART.shinL, kneeL);
  set(pose, PART.shinR, kneeR);
  set(pose, PART.shoeL, amp.thigh * s * 0.5 - kneeL * 0.35 + 0.05);
  set(pose, PART.shoeR, -amp.thigh * s * 0.5 - kneeR * 0.35 + 0.05);
  set(pose, PART.pelvis, 0, amp.twist * s, 0);
  set(pose, PART.abdomen, amp.lean * 0.5, -amp.twist * s * 0.6, 0);
  set(pose, PART.torso, amp.lean * 0.5, -amp.twist * s * 0.6, 0);
  set(pose, PART.neck, -amp.lean * 0.6, amp.twist * s * 0.3, 0);
  set(pose, PART.head, 0, 0, 0);
  pose[52] = amp.bob * Math.cos(phase * TAU * 2) - amp.bob * 0.5;
}

export const CLIPS = {
  idle(pose, phase, time) {
    const breathe = Math.sin(time * 1.6);
    const sway = Math.sin(time * 0.45);
    set(pose, PART.pelvis, 0, 0, sway * 0.025);
    set(pose, PART.abdomen, 0.01 + breathe * 0.01, 0, -sway * 0.015);
    set(pose, PART.torso, 0.015 + breathe * 0.012, 0, -sway * 0.01);
    set(pose, PART.neck, -0.02, Math.sin(time * 0.3) * 0.12, 0);
    set(pose, PART.head, 0.03, Math.sin(time * 0.21) * 0.1, 0);
    relaxedArms(pose, 0.04, -0.12 - breathe * 0.02, 0.1);
    set(pose, PART.thighL, -0.02, 0.05, 0.03 + sway * 0.02);
    set(pose, PART.thighR, 0.02, -0.08, -0.03 + sway * 0.02);
    set(pose, PART.shinL, 0.04);
    set(pose, PART.shinR, 0.06);
    set(pose, PART.shoeL, -0.02, 0, -sway * 0.02);
    set(pose, PART.shoeR, -0.04, 0, -sway * 0.02);
    pose[52] = -0.004;
  },
  walk(pose, phase) {
    gait(pose, phase, { thigh: 0.42, knee: 0.62, kneeBase: 0.08, twist: 0.08, lean: 0.04, bob: 0.022 });
    relaxedArms(pose, 0.32 * Math.sin(phase * TAU), -0.22 - 0.12 * Math.max(0, Math.sin(phase * TAU)));
  },
  run(pose, phase) {
    gait(pose, phase, { thigh: 0.8, knee: 1.25, kneeBase: 0.25, twist: 0.14, lean: 0.24, bob: 0.06 });
    relaxedArms(pose, 0.75 * Math.sin(phase * TAU), -1.3, 0.14);
  },
  flee(pose, phase, time) {
    gait(pose, phase, { thigh: 0.85, knee: 1.3, kneeBase: 0.25, twist: 0.16, lean: 0.3, bob: 0.065 });
    const flail = Math.sin(time * 11);
    set(pose, PART.upperArmL, -2.3 + flail * 0.25, 0, 0.35);
    set(pose, PART.upperArmR, -2.3 - flail * 0.25, 0, -0.35);
    set(pose, PART.forearmL, -0.6, 0, 0);
    set(pose, PART.forearmR, -0.6, 0, 0);
    set(pose, PART.neck, -0.1, Math.sin(time * 2.3) * 0.5, 0);
  },
  aim(pose, phase, time) {
    const breathe = Math.sin(time * 1.6) * 0.01;
    set(pose, PART.pelvis, 0, -0.3, 0);
    set(pose, PART.abdomen, 0.02, 0.12, 0);
    set(pose, PART.torso, 0.04 + breathe, 0.18, 0);
    set(pose, PART.neck, -0.02, 0.0, 0);
    set(pose, PART.head, 0.06, 0.05, -0.05);
    set(pose, PART.upperArmR, -1.5, 0.15, -0.12);
    set(pose, PART.forearmR, -0.05, 0, 0);
    set(pose, PART.handR, 0, 0, 0);
    set(pose, PART.upperArmL, -1.25, -0.3, -0.55);
    set(pose, PART.forearmL, -0.75, 0, 0);
    set(pose, PART.handL, 0, 0, 0);
    set(pose, PART.thighL, -0.18, 0.2, 0.06);
    set(pose, PART.thighR, 0.12, -0.2, -0.08);
    set(pose, PART.shinL, 0.22);
    set(pose, PART.shinR, 0.1);
    set(pose, PART.shoeL, -0.04);
    set(pose, PART.shoeR, -0.02);
    pose[52] = -0.03;
  },
  sit(pose) {
    set(pose, PART.pelvis, -0.15, 0, 0);
    set(pose, PART.abdomen, 0.05, 0, 0);
    set(pose, PART.torso, 0.02, 0, 0);
    set(pose, PART.neck, 0.05, 0, 0);
    set(pose, PART.head, 0.02, 0, 0);
    set(pose, PART.thighL, -1.45, 0.05, 0.06);
    set(pose, PART.thighR, -1.45, -0.05, -0.06);
    set(pose, PART.shinL, 1.3);
    set(pose, PART.shinR, 1.3);
    set(pose, PART.shoeL, 0.1);
    set(pose, PART.shoeR, 0.1);
    set(pose, PART.upperArmL, -0.85, 0, 0.25);
    set(pose, PART.upperArmR, -0.85, 0, -0.25);
    set(pose, PART.forearmL, -0.7, 0, 0);
    set(pose, PART.forearmR, -0.7, 0, 0);
    set(pose, PART.handL, 0, 0, 0);
    set(pose, PART.handR, 0, 0, 0);
    pose[52] = -0.42;
  },
  /** One-shot: phase runs 0 to 1 while stepping into a car; exit plays it backwards. */
  enter(pose, phase, time) {
    CLIPS.idle(pose, phase, time);
    const duck = Math.sin(Math.min(1, phase) * Math.PI);
    const settle = Math.min(1, Math.max(0, (phase - 0.55) / 0.45));
    set(pose, PART.thighL, -1.3 * Math.min(1, phase * 2.2), 0.1, 0.1);
    set(pose, PART.shinL, 1.2 * duck + 1.3 * settle);
    set(pose, PART.thighR, -0.4 * duck - 1.45 * settle, 0, -0.06);
    set(pose, PART.shinR, 0.6 * duck + 1.3 * settle);
    set(pose, PART.torso, 0.45 * duck, 0, 0);
    set(pose, PART.neck, 0.25 * duck, 0, 0);
    set(pose, PART.upperArmL, -0.9 * duck, 0, 0.3);
    set(pose, PART.forearmL, -0.5, 0, 0);
    pose[52] = -0.42 * settle - 0.12 * duck;
  },
  exit(pose, phase, time) {
    CLIPS.enter(pose, 1 - phase, time);
  },
};

Object.assign(CLIPS, ACTION_CLIPS);
export const CLIP_NAMES = Object.keys(CLIPS);
const FADE_SECONDS = 0.28;

function ease(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Blends clips with eased cross-fades. play(name) starts a fade; update(dt, speed) advances the gait phase
 * from ground speed and the one-shot progress; sample(time, pose) writes the blended pose.
 */
export class Animator {
  constructor(startClip = 'idle', phase = 0) {
    this.levels = Object.fromEntries(CLIP_NAMES.map((name) => [name, name === startClip ? 1 : 0]));
    this.target = startClip;
    this.phase = phase;
    this.oneShot = 0;
    this.scratch = new Float32Array(POSE_SIZE);
  }

  /** Start a one-shot clip again from the beginning even if it is already playing. */
  replay(name) {
    this.target = name;
    this.oneShot = 0;
  }

  /** Whether the current one-shot clip has finished. */
  get done() {
    return this.oneShot >= 1;
  }

  play(name) {
    if (name === this.target) return;
    this.target = name;
    if (ONE_SHOT_CLIPS.has(name)) this.oneShot = 0;
  }

  update(dt, speed) {
    const stride = this.target === 'run' || this.target === 'flee' ? 2.5 : 1.45;
    this.phase = (this.phase + (dt * Math.max(speed, 0.6)) / stride) % 1;
    this.oneShot = Math.min(1, this.oneShot + dt / (ONE_SHOT_CLIPS.get(this.target) ?? 0.9));
    const rate = dt / FADE_SECONDS;
    for (const name of CLIP_NAMES) {
      const goal = name === this.target ? 1 : 0;
      const level = this.levels[name];
      this.levels[name] = goal > level ? Math.min(goal, level + rate) : Math.max(goal, level - rate);
    }
  }

  sample(time, pose) {
    pose.fill(0);
    let total = 0;
    for (const name of CLIP_NAMES) {
      const weight = ease(this.levels[name]);
      if (weight < 0.001) continue;
      this.scratch.fill(0);
      const phase = ONE_SHOT_CLIPS.has(name) ? (name === this.target ? this.oneShot : 1) : this.phase;
      CLIPS[name](this.scratch, phase, time);
      for (let index = 0; index < POSE_SIZE; index += 1) pose[index] += this.scratch[index] * weight;
      total += weight;
    }
    if (total > 0) for (let index = 0; index < POSE_SIZE; index += 1) pose[index] /= total;
  }
}
