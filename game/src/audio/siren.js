// Police voices: the cruiser siren (slow wail far off or while searching, fast yelp up close) and the rotor thump.
import { noiseSource } from './mixer.js';

/** 1 inside ref metres, fading with distance to 0 at max metres. */
export function distanceGain(metres, ref = 12, max = 220) {
  if (!Number.isFinite(metres) || metres >= max) return 0;
  if (metres <= ref) return 1;
  const fall = ref / metres;
  const edge = 1 - (metres - ref) / (max - ref);
  return fall * Math.sqrt(edge);
}

/** Siren sweep: rate in Hz of the LFO and its depth in Hz around the centre pitch. */
export function sirenSweep(metres, searching) {
  if (searching) return { rate: 0.22, depth: 220, centre: 760 };
  return metres < 45 ? { rate: 3.6, depth: 300, centre: 980 } : { rate: 0.42, depth: 330, centre: 900 };
}

/** Builds the siren and rotor once; update() moves pitch, sweep and level. */
export function createSiren(mixer) {
  let nodes = null;
  mixer.whenReady((ctx) => {
    const tone = ctx.createOscillator();
    tone.type = 'triangle';
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.connect(depth).connect(tone.frequency);
    const shape = ctx.createBiquadFilter();
    shape.type = 'peaking';
    shape.frequency.value = 1400;
    shape.gain.value = 6;
    const siren = ctx.createGain();
    siren.gain.value = 0;
    tone.connect(shape).connect(siren).connect(mixer.bus.police);

    const rotorFilter = ctx.createBiquadFilter();
    rotorFilter.type = 'lowpass';
    rotorFilter.frequency.value = 340;
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const chopper = ctx.createOscillator();
    chopper.type = 'square';
    chopper.frequency.value = 12.5;
    const chopDepth = ctx.createGain();
    chopDepth.gain.value = 0.5;
    chopper.connect(chopDepth).connect(chop.gain);
    const rotor = ctx.createGain();
    rotor.gain.value = 0;
    noiseSource(mixer).connect(rotorFilter).connect(chop).connect(rotor).connect(mixer.bus.police);
    for (const osc of [tone, lfo, chopper]) osc.start();
    nodes = { tone, lfo, depth, siren, rotor };
  });

  return {
    /** sirenMetres / rotorMetres: Infinity when there is nothing to hear. */
    update(sirenMetres, searching, rotorMetres) {
      if (!nodes) return;
      const t = mixer.ctx.currentTime;
      const sweep = sirenSweep(sirenMetres, searching);
      nodes.tone.frequency.setTargetAtTime(sweep.centre, t, 0.2);
      nodes.lfo.frequency.setTargetAtTime(sweep.rate, t, 0.2);
      nodes.depth.gain.setTargetAtTime(sweep.depth, t, 0.2);
      const level = distanceGain(sirenMetres, 14, 260) * (searching ? 0.55 : 1);
      nodes.siren.gain.setTargetAtTime(level * 0.32, t, 0.12);
      nodes.rotor.gain.setTargetAtTime(distanceGain(rotorMetres, 30, 320) * 0.7, t, 0.2);
    },
  };
}
