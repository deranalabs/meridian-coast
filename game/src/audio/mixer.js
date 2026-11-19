// Audio mixer: one AudioContext made on the first key press, a master gain with volume, mute and duck, and buses.

/** Relative level of each bus under the master gain. */
export const BUS_LEVELS = Object.freeze({ sfx: 0.9, engine: 0.5, police: 0.55, radio: 0.38, voice: 0.85 });

/** Any input to a number in 0..1; junk becomes the fallback. */
export function clampVolume(value, fallback = 1) {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/** The gain the master node should hold: silent while muted, volume times the duck factor otherwise. */
export function masterLevel(volume, muted, duck = 1) {
  return muted ? 0 : clampVolume(volume) * clampVolume(duck);
}

/** Creates the mixer; the context stays null until unlock() runs inside a user gesture. */
export function createMixer({ volume = 0.8, muted = false } = {}) {
  const ready = [];
  const mixer = {
    ctx: null,
    master: null,
    bus: {},
    noise: null,
    volume: clampVolume(volume, 0.8),
    muted: Boolean(muted),
    duckLevel: 1,
    /** Run fn(ctx) once the context exists (now, if it already does). */
    whenReady(fn) {
      if (mixer.ctx) fn(mixer.ctx);
      else ready.push(fn);
    },
    unlock() {
      if (mixer.ctx) {
        if (mixer.ctx.state === 'suspended') mixer.ctx.resume().catch(() => {});
        return;
      }
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return;
      const ctx = new Context();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 6;
      limiter.connect(ctx.destination);
      mixer.master = ctx.createGain();
      mixer.master.gain.value = 0;
      mixer.master.connect(limiter);
      for (const [name, level] of Object.entries(BUS_LEVELS)) {
        const gain = ctx.createGain();
        gain.gain.value = level;
        gain.connect(mixer.master);
        mixer.bus[name] = gain;
      }
      mixer.noise = whiteNoise(ctx, 2);
      mixer.ctx = ctx;
      apply();
      for (const fn of ready.splice(0)) fn(ctx);
    },
    setVolume(value) {
      mixer.volume = clampVolume(value, mixer.volume);
      apply();
    },
    setMuted(on) {
      mixer.muted = Boolean(on);
      apply();
    },
    toggleMute() {
      mixer.setMuted(!mixer.muted);
      return mixer.muted;
    },
    /** 1 = full level, lower values duck everything (the pause menu uses about 0.25). */
    duck(level) {
      mixer.duckLevel = clampVolume(level);
      apply();
    },
  };
  function apply() {
    if (!mixer.master) return;
    const level = masterLevel(mixer.volume, mixer.muted, mixer.duckLevel);
    mixer.master.gain.setTargetAtTime(level, mixer.ctx.currentTime, 0.05);
  }
  return mixer;
}

/** A mono buffer of white noise, shared by every noisy voice. */
function whiteNoise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 22695477;
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  return buffer;
}

/** A looping source of the shared noise, started once. */
export function noiseSource(mixer) {
  const source = mixer.ctx.createBufferSource();
  source.buffer = mixer.noise;
  source.loop = true;
  source.start();
  return source;
}
