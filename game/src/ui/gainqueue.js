// The "+$450" and "+12 respect" pop-ups by the cash figure: which rises show, how quick ones merge, and their fade.

/** Seconds a pop-up stays up. */
export const GAIN_LIFE = 2.4;
/** A rise of the same kind within this many seconds of the last joins its pop-up (a pay that counts up). */
export const GAIN_MERGE = 0.6;
/** Seconds after the HUD starts in which changes only set the baseline: a scene's or a load's starting money. */
export const GAIN_WARMUP = 1.0;
/** Pop-ups on screen at once; the oldest goes first. */
export const MAX_GAINS = 3;
const FADE_IN = 0.15;
const FADE_OUT = 0.7;
const RISE = 28;

/** A fresh queue: no values seen yet, no pop-ups. */
export function createGainState() {
  return { time: 0, last: {}, gains: [] };
}

/** The HUD's current `value` for `kind` ('cash' or 'respect'); a rise past the warm-up pops up or joins one. */
export function noteValue(state, kind, value) {
  const previous = state.last[kind];
  state.last[kind] = value;
  if (previous === undefined || state.time < GAIN_WARMUP || !(value > previous)) return;
  const amount = value - previous;
  const newest = state.gains.at(-1);
  if (newest && newest.kind === kind && newest.sinceRise < GAIN_MERGE) {
    newest.amount += amount;
    newest.sinceRise = 0;
    newest.age = Math.min(newest.age, FADE_IN);
    return;
  }
  state.gains.push({ kind, amount, age: 0, sinceRise: 0 });
  if (state.gains.length > MAX_GAINS) state.gains.shift();
}

/** Age every pop-up by `dt` seconds and drop the ones past their life. */
export function stepGains(state, dt) {
  state.time += dt;
  for (const gain of state.gains) {
    gain.age += dt;
    gain.sinceRise += dt;
  }
  for (let i = state.gains.length - 1; i >= 0; i -= 1) {
    if (state.gains[i].age >= GAIN_LIFE) state.gains.splice(i, 1);
  }
}

/** How a pop-up of `age` seconds looks: opacity 0..1 and how many pixels it has risen. */
export function gainLook(age) {
  const t = Math.max(0, Math.min(1, age / GAIN_LIFE));
  const opacity = Math.max(0, Math.min(1, age / FADE_IN, (GAIN_LIFE - age) / FADE_OUT));
  return { opacity, rise: RISE * (1 - (1 - t) * (1 - t)) };
}

/** The pop-up's words: money as the HUD writes it, respect with its name. */
export function gainText(kind, amount) {
  return kind === 'cash' ? `+$${amount.toLocaleString('en-US')}` : `+${amount} respect`;
}
