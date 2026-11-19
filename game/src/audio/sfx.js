// One-shot effects: gunshots by weapon class, impacts, UI clicks, cash chime, shop bell, police chirp and voices.
import { distanceGain } from './siren.js';
import { voicePattern, playVoice } from './voice.js';

/** Gunshot recipe per weapon: noise crack (Hz, seconds), body thump (Hz) and loudness. */
export const SHOT_PROFILES = Object.freeze({
  pistol: { crack: 2600, decay: 0.09, thump: 140, level: 0.8 },
  smg: { crack: 3400, decay: 0.05, thump: 180, level: 0.55 },
  shotgun: { crack: 1300, decay: 0.22, thump: 85, level: 1 },
  rifle: { crack: 2100, decay: 0.12, thump: 110, level: 0.9 },
});

/** The recipe for a weapon id; unknown guns sound like a pistol. */
export const shotProfile = (weapon) => SHOT_PROFILES[weapon] ?? SHOT_PROFILES.pistol;

/** Note lists (Hz, start s, length s) for the menu sounds. */
export const UI_NOTES = Object.freeze({
  move: [[880, 0, 0.04]],
  open: [[660, 0, 0.06], [990, 0.05, 0.08]],
  close: [[740, 0, 0.05], [494, 0.05, 0.08]],
  buy: [[784, 0, 0.06], [1175, 0.06, 0.1]],
  deny: [[220, 0, 0.09], [185, 0.09, 0.14]],
  pause: [[523, 0, 0.07], [392, 0.07, 0.1]],
  resume: [[392, 0, 0.06], [587, 0.06, 0.09]],
  select: [[1046, 0, 0.03]],
  reload: [[330, 0, 0.03], [440, 0.12, 0.03]],
  dry: [[1500, 0, 0.015]],
});

export function createSfx(mixer) {
  const live = () => mixer.ctx && mixer.ctx.state !== 'closed';

  function tone(freq, start, length, { type = 'square', level = 0.15, bus = 'sfx', glide = 0 } = {}) {
    const ctx = mixer.ctx;
    const t = ctx.currentTime + 0.005 + start;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t + length);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + length);
    osc.connect(gain).connect(mixer.bus[bus]);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  function burst(filterType, freq, length, level, q = 0.8) {
    const ctx = mixer.ctx;
    const t = ctx.currentTime + 0.005;
    const source = ctx.createBufferSource();
    source.buffer = mixer.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + length);
    source.connect(filter).connect(gain).connect(mixer.bus.sfx);
    source.start(t, Math.random() * 1.5);
    source.stop(t + length + 0.02);
  }

  return {
    /** A gunshot heard from `metres` away. */
    gunshot(weapon, metres = 0) {
      if (!live()) return;
      const p = shotProfile(weapon);
      const near = Math.max(0.08, distanceGain(metres, 6, 400));
      burst('bandpass', p.crack * (0.6 + near * 0.4), p.decay, p.level * near, 0.7);
      tone(p.thump, 0, p.decay * 1.6, { type: 'sine', level: 0.7 * p.level * near, glide: 0.45 });
    },
    /** kind: body, metal, punch, swing or crash; strength 0..1 scales crashes. */
    impact(kind, strength = 1) {
      if (!live()) return;
      if (kind === 'metal') {
        tone(520, 0, 0.18, { type: 'triangle', level: 0.18 });
        tone(1370, 0, 0.12, { type: 'triangle', level: 0.1 });
      } else if (kind === 'crash') {
        const s = Math.min(1, Math.max(0.2, strength));
        burst('lowpass', 900, 0.35 * s + 0.1, 0.9 * s);
        tone(70, 0, 0.3, { type: 'sine', level: 0.6 * s, glide: 0.5 });
      } else if (kind === 'swing') {
        burst('bandpass', 700, 0.14, 0.25, 1.5);
      } else {
        burst('lowpass', 420, 0.1, 0.55);
        tone(kind === 'punch' ? 110 : 90, 0, 0.1, { type: 'sine', level: 0.5, glide: 0.6 });
      }
    },
    ui(kind) {
      if (!live()) return;
      for (const [freq, start, length] of UI_NOTES[kind] ?? UI_NOTES.move) {
        tone(freq, start, length, { type: 'square', level: 0.08 });
      }
    },
    /** Two bright coin pings rising. */
    cash() {
      if (!live()) return;
      tone(1319, 0, 0.12, { type: 'triangle', level: 0.18 });
      tone(1976, 0.07, 0.25, { type: 'triangle', level: 0.16 });
    },
    /** The door bell when a shop opens: two inharmonic partials ringing out. */
    bell() {
      if (!live()) return;
      tone(1245, 0, 0.9, { type: 'sine', level: 0.12 });
      tone(3110, 0, 0.5, { type: 'sine', level: 0.05 });
      tone(988, 0.18, 1.0, { type: 'sine', level: 0.1 });
    },
    /** The cruiser's short whoop when a unit joins the chase. */
    chirp(metres = 40) {
      if (!live()) return;
      const level = 0.25 * Math.max(0.15, distanceGain(metres, 20, 300));
      tone(600, 0, 0.22, { type: 'sawtooth', level, glide: 2.1, bus: 'police' });
    },
    /** A low sting for busted and wasted. */
    sting() {
      if (!live()) return;
      tone(196, 0, 0.9, { type: 'sawtooth', level: 0.12, glide: 0.5 });
      tone(233, 0.05, 0.9, { type: 'sawtooth', level: 0.08, glide: 0.5 });
    },
    /** Spray-can hiss for the respray shop. */
    spray() {
      if (live()) burst('highpass', 4000, 0.9, 0.3);
    },
    /** Speaks a dialogue line as blips; returns its length in seconds (0 when audio is locked). */
    voice(characterId, line) {
      if (!live()) return 0;
      return playVoice(mixer.ctx, mixer.bus.voice, voicePattern(characterId, line));
    },
  };
}
