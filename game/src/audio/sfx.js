// One-shot sounds: gunshots per weapon, bullet impacts, crashes, being hit, shop clicks and the cash chime.

const GUNS = {
  pistol: { cut: 2600, body: 150, length: 0.22, level: 0.9 },
  smg: { cut: 3400, body: 190, length: 0.12, level: 0.65 },
  shotgun: { cut: 1500, body: 90, length: 0.4, level: 1.1 },
  fists: { cut: 700, body: 110, length: 0.08, level: 0.4 },
};

/** Sounds over a started mixer; every call is a no-op until audio exists. */
export function createSfx(mixer) {
  function noiseBurst(bus, at, { cut, q = 0.8, type = 'lowpass', length, level, offset = 0 }) {
    const ctx = mixer.ctx;
    const source = ctx.createBufferSource();
    source.buffer = mixer.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cut;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    source.connect(filter).connect(gain).connect(mixer.bus[bus]);
    source.start(at, offset, length + 0.05);
  }

  function tone(bus, at, { type = 'sine', from, to = from, length, level }) {
    const ctx = mixer.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(mixer.bus[bus]);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  const ready = () => Boolean(mixer.ctx) && mixer.ctx.state === 'running';

  return {
    /** A gunshot `distance` metres away. */
    gunshot(weapon, distance) {
      if (!ready()) return;
      const gun = GUNS[weapon] ?? GUNS.pistol;
      const near = 1 / (1 + distance / 18);
      const at = mixer.now();
      noiseBurst('sfx', at, { cut: gun.cut * (0.4 + near * 0.6), length: gun.length, level: gun.level * near,
        offset: Math.random() * 1.5 });
      tone('sfx', at, { type: 'triangle', from: gun.body, to: 40, length: gun.length * 0.8, level: gun.level * near });
      if (distance > 40) noiseBurst('sfx', at + 0.09, { cut: 600, length: 0.5, level: 0.15 * near });
    },
    impact(kind) {
      if (!ready()) return;
      const at = mixer.now();
      if (kind === 'car') tone('sfx', at, { type: 'square', from: 900, to: 300, length: 0.07, level: 0.12 });
      noiseBurst('sfx', at, { cut: kind === 'body' ? 500 : 3000, type: 'bandpass', q: 1.5, length: 0.06,
        level: 0.3 });
    },
    crash(speed, distance) {
      if (!ready()) return;
      const level = Math.min(1, speed / 14) / (1 + distance / 20);
      if (level < 0.03) return;
      const at = mixer.now();
      noiseBurst('sfx', at, { cut: 900, length: 0.45, level: level * 1.1, offset: Math.random() });
      tone('sfx', at, { type: 'sawtooth', from: 120, to: 45, length: 0.3, level: level * 0.5 });
      noiseBurst('sfx', at + 0.05, { cut: 5200, type: 'highpass', length: 0.25, level: level * 0.35 });
    },
    hurt() {
      if (!ready()) return;
      tone('sfx', mixer.now(), { type: 'sine', from: 160, to: 70, length: 0.18, level: 0.5 });
    },
    ui(kind) {
      if (!ready()) return;
      const at = mixer.now();
      if (kind === 'move') tone('ui', at, { type: 'triangle', from: 1320, length: 0.05, level: 0.25 });
      else if (kind === 'deny') tone('ui', at, { type: 'square', from: 180, to: 140, length: 0.16, level: 0.18 });
      else if (kind === 'buy') {
        tone('ui', at, { type: 'triangle', from: 880, length: 0.09, level: 0.3 });
        tone('ui', at + 0.08, { type: 'triangle', from: 1320, length: 0.16, level: 0.3 });
      } else tone('ui', at, { type: 'sine', from: kind === 'open' ? 660 : 520, to: kind === 'open' ? 990 : 330,
        length: 0.12, level: 0.25 });
    },
    cash() {
      if (!ready()) return;
      const at = mixer.now();
      [1568, 2093, 2637].forEach((f, i) => tone('ui', at + i * 0.06, { type: 'sine', from: f, length: 0.2,
        level: 0.2 }));
    },
    click() {
      if (!ready()) return;
      tone('sfx', mixer.now(), { type: 'square', from: 2400, length: 0.025, level: 0.12 });
    },
  };
}
