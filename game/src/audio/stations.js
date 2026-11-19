// Radio beds: one procedural loop per station (synthwave, driving electro, a hillside waltz, talk-show babble).

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Per station: beats per minute, steps per beat, steps per bar, chord roots per bar and a step() voice plan. */
const BEDS = [
  { bpm: 96, sub: 4, bar: 16, roots: [45, 41, 43, 40], plan(s, root, v) {
    if (s % 4 === 0) v.note('sawtooth', hz(root - 12), 0.32, 0.22, 500);
    const arp = [0, 7, 12, 16, 12, 7, 3, 7][s % 8];
    v.note('triangle', hz(root + 12 + arp), 0.14, 0.07, 3000);
    if (s % 8 === 4) v.hat(0.05);
  } },
  { bpm: 118, sub: 4, bar: 16, roots: [38, 38, 41, 36], plan(s, root, v) {
    if (s % 4 === 0) v.kick();
    if (s % 4 === 2) v.hat(0.09);
    if (s % 2 === 1) v.note('square', hz(root - 12 + (s % 8 === 7 ? 12 : 0)), 0.1, 0.09, 700);
    if ([0, 3, 6, 10, 12].includes(s)) v.note('sawtooth', hz(root + 24 + [0, 3, 7, 10, 12][s % 5]), 0.12, 0.05, 2400);
  } },
  { bpm: 84, sub: 2, bar: 6, roots: [48, 53, 55, 48], plan(s, root, v) {
    if (s === 0) v.note('sine', hz(root - 12), 0.6, 0.2, 900);
    if (s === 2 || s === 4) [4, 7].forEach((i) => v.note('triangle', hz(root + i), 0.3, 0.06, 2000));
    const tune = [12, 16, 19, 17, 16, 14][s];
    v.note('triangle', hz(root + tune), 0.34, 0.08, 4000);
  } },
  { bpm: 150, sub: 2, bar: 8, roots: [0], plan(s, root, v, seed) {
    if ((seed >> 3) % 5 !== 0) v.voice(260 + ((seed >> 5) % 6) * 140, 0.08 + ((seed >> 9) % 3) * 0.04);
  } },
];

/** A radio on a started mixer: update(station, on) keeps about 0.2 s of notes scheduled ahead. */
export function createStations(mixer) {
  const ctx = mixer.ctx;
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(mixer.bus.radio);
  const state = { station: -1, step: 0, next: 0, seed: 1, at: 0 };

  const voices = {
    note(type, freq, length, level, cut) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const filter = ctx.createBiquadFilter();
      filter.frequency.value = cut;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, state.at);
      gain.gain.exponentialRampToValueAtTime(level, state.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, state.at + length);
      osc.connect(filter).connect(gain).connect(out);
      osc.start(state.at);
      osc.stop(state.at + length + 0.02);
    },
    kick() {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(140, state.at);
      osc.frequency.exponentialRampToValueAtTime(42, state.at + 0.12);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, state.at);
      gain.gain.exponentialRampToValueAtTime(0.0001, state.at + 0.2);
      osc.connect(gain).connect(out);
      osc.start(state.at);
      osc.stop(state.at + 0.22);
    },
    hat(level) {
      voices.noise('highpass', 7000, 2, 0.04, level);
    },
    voice(freq, length) {
      voices.noise('bandpass', freq, 6, length, 0.35);
    },
    noise(type, freq, q, length, level) {
      const source = ctx.createBufferSource();
      source.buffer = mixer.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, state.at);
      gain.gain.exponentialRampToValueAtTime(0.0001, state.at + length);
      source.connect(filter).connect(gain).connect(out);
      source.start(state.at, (state.seed % 997) / 600, length + 0.02);
    },
  };

  return {
    update(station, on) {
      const now = ctx.currentTime;
      out.gain.setTargetAtTime(on ? 1 : 0, now, 0.2);
      if (!on) return;
      if (station !== state.station) Object.assign(state, { station, step: 0, next: now + 0.05 });
      if (state.next < now - 0.3) state.next = now + 0.05;
      const bed = BEDS[station % BEDS.length];
      const stepLength = 60 / bed.bpm / bed.sub;
      while (state.next < now + 0.2) {
        state.seed = (state.seed * 1103515245 + 12345) >>> 0;
        const bar = Math.floor(state.step / bed.bar);
        state.at = state.next;
        bed.plan(state.step % bed.bar, bed.roots[bar % bed.roots.length], voices, state.seed);
        state.step += 1;
        state.next += stepLength;
      }
    },
  };
}
