// Character voices: a short, repeatable blip pattern from a character id and a line, for dialogue cards and talk radio.

/** A small string hash (FNV-1a), stable across runs. */
export function textHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Each character's voice: base pitch (Hz), pitch spread, speed and waveform, all from the id. */
export function voiceOf(characterId) {
  const h = textHash(String(characterId));
  return {
    base: 92 + (h % 170),
    spread: 0.12 + ((h >>> 8) % 20) / 100,
    rate: 0.85 + ((h >>> 16) % 30) / 100,
    wave: ['square', 'triangle', 'sawtooth'][(h >>> 24) % 3],
  };
}

/** Syllable count of a word: groups of vowels, at least one. */
export function syllables(word) {
  const groups = word.toLowerCase().match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

const MAX_BLIPS = 36;

/**
 * The pattern for one line: { voice, blips: [{ at, dur, freq, level }], length } in seconds from the start.
 * Words become one blip per syllable; commas and full stops add pauses; a question rises at the end.
 */
export function voicePattern(characterId, line) {
  const voice = voiceOf(characterId);
  const blips = [];
  const step = 0.085 / voice.rate;
  const tokens = String(line).match(/[A-Za-z0-9']+|[,.;:!?]/g) || [];
  const question = /\?\s*$/.test(line);
  const shout = /!/.test(line);
  let at = 0;
  let n = 0;
  for (const token of tokens) {
    if (/^[,;:]$/.test(token)) at += step * 2;
    else if (/^[.!?]$/.test(token)) at += step * 3.5;
    else {
      const count = syllables(token);
      const h = textHash(token.toLowerCase());
      for (let s = 0; s < count && blips.length < MAX_BLIPS; s += 1) {
        const wobble = (((h >>> (s * 5)) & 31) / 31 - 0.5) * 2;
        const freq = voice.base * (1 + wobble * voice.spread);
        blips.push({ at, dur: step * 0.8, freq, level: shout ? 1 : 0.75 });
        at += step;
        n += 1;
      }
      at += step * 0.4;
    }
  }
  if (question && blips.length) {
    const last = blips[blips.length - 1];
    last.freq *= 1.35;
    last.dur *= 1.4;
  }
  return { voice, blips, length: at, syllables: n };
}

/** Plays a pattern through one oscillator into dest; returns its length in seconds (0 without audio). */
export function playVoice(ctx, dest, pattern, when = ctx.currentTime + 0.02) {
  if (!pattern.blips.length) return 0;
  const osc = ctx.createOscillator();
  osc.type = pattern.voice.wave;
  const formant = ctx.createBiquadFilter();
  formant.type = 'bandpass';
  formant.frequency.value = pattern.voice.base * 6;
  formant.Q.value = 1.4;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(formant).connect(gain).connect(dest);
  for (const blip of pattern.blips) {
    const t = when + blip.at;
    osc.frequency.setValueAtTime(blip.freq, t);
    gain.gain.setTargetAtTime(0.22 * blip.level, t, 0.008);
    gain.gain.setTargetAtTime(0, t + blip.dur * 0.7, 0.02);
  }
  osc.start(when);
  osc.stop(when + pattern.length + 0.2);
  return pattern.length;
}
