// Engine and tyre voice: a detuned saw pair through a low-pass for the motor, band-passed noise for tyre squeal.
import { noiseSource } from './mixer.js';

/** Where each gear ends, as a fraction of top speed. */
export const GEAR_TOPS = Object.freeze([0.16, 0.34, 0.55, 0.78, 1]);

/** Engine revs 0..1 from the speed ratio: they climb through a gear and drop at each shift. */
export function engineRevs(speedRatio) {
  const s = Math.min(1, Math.max(0, Math.abs(speedRatio)));
  let low = 0;
  for (let gear = 0; gear < GEAR_TOPS.length; gear += 1) {
    const top = GEAR_TOPS[gear];
    if (s <= top || gear === GEAR_TOPS.length - 1) {
      const through = (s - low) / (top - low);
      const floor = gear === 0 ? 0.12 : 0.42;
      return floor + (1 - floor) * through;
    }
    low = top;
  }
  return 1;
}

/** Motor pitch (Hz), filter cutoff (Hz) and level from revs and throttle. */
export function engineTone(speedRatio, throttle) {
  const revs = engineRevs(speedRatio);
  const load = Math.min(1, Math.abs(throttle));
  return {
    freq: 34 + revs * 88,
    cutoff: 260 + revs * 900 + load * 700,
    level: 0.22 + load * 0.32 + revs * 0.14,
  };
}

/** Builds the voice when the context exists; update() only moves parameters. */
export function createEngine(mixer) {
  let nodes = null;
  mixer.whenReady((ctx) => {
    const body = ctx.createOscillator();
    const growl = ctx.createOscillator();
    const sub = ctx.createOscillator();
    body.type = 'sawtooth';
    growl.type = 'sawtooth';
    sub.type = 'square';
    growl.detune.value = 14;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.35;
    const motor = ctx.createGain();
    motor.gain.value = 0;
    body.connect(filter);
    growl.connect(filter);
    sub.connect(subGain).connect(filter);
    filter.connect(motor).connect(mixer.bus.engine);
    const tyreFilter = ctx.createBiquadFilter();
    tyreFilter.type = 'bandpass';
    tyreFilter.frequency.value = 1900;
    tyreFilter.Q.value = 5;
    const tyres = ctx.createGain();
    tyres.gain.value = 0;
    noiseSource(mixer).connect(tyreFilter).connect(tyres).connect(mixer.bus.engine);
    for (const osc of [body, growl, sub]) osc.start();
    nodes = { body, growl, sub, filter, motor, tyres, tyreFilter };
  });

  return {
    /** active: player is driving; slip in m/s of sideways slide. */
    update(active, speedRatio, throttle, slip) {
      if (!nodes) return;
      const t = mixer.ctx.currentTime;
      if (!active) {
        nodes.motor.gain.setTargetAtTime(0, t, 0.15);
        nodes.tyres.gain.setTargetAtTime(0, t, 0.08);
        return;
      }
      const tone = engineTone(speedRatio, throttle);
      nodes.body.frequency.setTargetAtTime(tone.freq, t, 0.06);
      nodes.growl.frequency.setTargetAtTime(tone.freq * 1.5, t, 0.06);
      nodes.sub.frequency.setTargetAtTime(tone.freq / 2, t, 0.06);
      nodes.filter.frequency.setTargetAtTime(tone.cutoff, t, 0.05);
      nodes.motor.gain.setTargetAtTime(tone.level, t, 0.08);
      const squeal = Math.min(1, Math.max(0, (slip - 1.5) / 5)) * Math.min(1, Math.abs(speedRatio) * 4);
      nodes.tyres.gain.setTargetAtTime(squeal * 0.5, t, 0.05);
      nodes.tyreFilter.frequency.setTargetAtTime(1600 + squeal * 900, t, 0.1);
    },
  };
}
