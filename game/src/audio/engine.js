// Car sound: a two-oscillator engine whose pitch follows speed through five gears, plus tyre squeal from slip.

const GEARS = [0, 9, 17, 26, 36, 60];

/** Revs 0..1 within the current gear for a speed in m/s. */
export function revsFor(speed) {
  const s = Math.abs(speed);
  for (let gear = 1; gear < GEARS.length; gear += 1) {
    if (s < GEARS[gear]) return (s - GEARS[gear - 1]) / (GEARS[gear] - GEARS[gear - 1]);
  }
  return 1;
}

/** Persistent engine and tyre voices on a started mixer; update() only moves parameters. */
export function createEngineSound(mixer) {
  const ctx = mixer.ctx;
  const low = ctx.createOscillator();
  low.type = 'sawtooth';
  const high = ctx.createOscillator();
  high.type = 'square';
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.Q.value = 2;
  const engine = ctx.createGain();
  engine.gain.value = 0;
  const highLevel = ctx.createGain();
  highLevel.gain.value = 0.25;
  low.connect(tone);
  high.connect(highLevel).connect(tone);
  tone.connect(engine).connect(mixer.bus.engine);

  const tyre = ctx.createBufferSource();
  tyre.buffer = mixer.noise;
  tyre.loop = true;
  const squeal = ctx.createBiquadFilter();
  squeal.type = 'bandpass';
  squeal.frequency.value = 2300;
  squeal.Q.value = 9;
  const tyreGain = ctx.createGain();
  tyreGain.gain.value = 0;
  tyre.connect(squeal).connect(tyreGain).connect(mixer.bus.engine);
  low.start();
  high.start();
  tyre.start();

  return {
    /** car = {driving, speed (m/s), throttle (-1..1), slip, handbrake}. */
    update(car) {
      const at = ctx.currentTime;
      if (!car.driving) {
        engine.gain.setTargetAtTime(0, at, 0.15);
        tyreGain.gain.setTargetAtTime(0, at, 0.08);
        return;
      }
      const load = Math.max(0, car.throttle);
      const revs = revsFor(car.speed);
      const base = 38 + revs * 70 + Math.min(1, Math.abs(car.speed) / 60) * 30 + load * 8;
      low.frequency.setTargetAtTime(base, at, 0.05);
      high.frequency.setTargetAtTime(base * 2.01, at, 0.05);
      tone.frequency.setTargetAtTime(380 + load * 900 + revs * 500, at, 0.08);
      engine.gain.setTargetAtTime(0.16 + load * 0.16, at, 0.08);
      const slide = Math.max(0, Math.min(1, (car.slip - 2.5) / 6)) * Math.min(1, Math.abs(car.speed) / 8);
      squeal.frequency.setTargetAtTime(1900 + slide * 900, at, 0.1);
      tyreGain.gain.setTargetAtTime(slide * 0.5, at, 0.06);
    },
  };
}
