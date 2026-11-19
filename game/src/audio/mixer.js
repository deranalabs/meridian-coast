// Audio mixer: one AudioContext opened on the first key press, master volume, M to mute, buses and shared noise.

const BUSES = { sfx: 0.9, engine: 0.55, siren: 0.35, radio: 0.32, ui: 0.6 };

function makeNoise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 22695477;
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  return buffer;
}

/** Listens on `target` for the first key or pointer press; onStart(fn) runs fn(mixer) once audio exists. */
export function createMixer(target = window) {
  const mixer = { ctx: null, master: null, bus: {}, noise: null, muted: false, volume: 0.8 };
  const starters = [];

  function apply() {
    if (!mixer.master) return;
    mixer.master.gain.setTargetAtTime(mixer.muted ? 0 : mixer.volume, mixer.ctx.currentTime, 0.03);
  }

  function start() {
    if (mixer.ctx) {
      if (mixer.ctx.state === 'suspended') mixer.ctx.resume();
      return;
    }
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (!Context) return;
    const ctx = new Context();
    mixer.ctx = ctx;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 8;
    limiter.connect(ctx.destination);
    mixer.master = ctx.createGain();
    mixer.master.connect(limiter);
    for (const [name, level] of Object.entries(BUSES)) {
      const gain = ctx.createGain();
      gain.gain.value = level;
      gain.connect(mixer.master);
      mixer.bus[name] = gain;
    }
    mixer.noise = makeNoise(ctx, 2);
    apply();
    for (const fn of starters) fn(mixer);
  }

  target.addEventListener('keydown', (event) => {
    start();
    if (event.code === 'KeyM' && !event.repeat) mixer.toggleMute();
  });
  target.addEventListener('pointerdown', start);

  mixer.onStart = (fn) => {
    if (mixer.ctx) fn(mixer);
    else starters.push(fn);
  };
  mixer.toggleMute = () => {
    mixer.muted = !mixer.muted;
    apply();
    return mixer.muted;
  };
  mixer.setVolume = (value) => {
    mixer.volume = Math.max(0, Math.min(1, value));
    apply();
  };
  mixer.now = () => (mixer.ctx ? mixer.ctx.currentTime : 0);
  return mixer;
}
