// Police sound: a wailing siren from the nearest cruiser, louder as it closes, and the helicopter's rotor thump.

/** Persistent siren and rotor voices on a started mixer; update() only moves parameters. */
export function createSirenSound(mixer) {
  const ctx = mixer.ctx;
  const siren = ctx.createOscillator();
  siren.type = 'triangle';
  siren.frequency.value = 860;
  const wail = ctx.createOscillator();
  wail.frequency.value = 0.28;
  const depth = ctx.createGain();
  depth.gain.value = 330;
  wail.connect(depth).connect(siren.frequency);
  const shape = ctx.createBiquadFilter();
  shape.type = 'bandpass';
  shape.frequency.value = 1100;
  shape.Q.value = 0.7;
  const sirenGain = ctx.createGain();
  sirenGain.gain.value = 0;
  siren.connect(shape).connect(sirenGain).connect(mixer.bus.siren);

  const rotor = ctx.createBufferSource();
  rotor.buffer = mixer.noise;
  rotor.loop = true;
  const rotorTone = ctx.createBiquadFilter();
  rotorTone.type = 'lowpass';
  rotorTone.frequency.value = 220;
  const chop = ctx.createGain();
  chop.gain.value = 0;
  const blade = ctx.createOscillator();
  blade.type = 'square';
  blade.frequency.value = 11;
  const bladeDepth = ctx.createGain();
  bladeDepth.gain.value = 0;
  blade.connect(bladeDepth).connect(chop.gain);
  rotor.connect(rotorTone).connect(chop).connect(mixer.bus.siren);
  siren.start();
  wail.start();
  rotor.start();
  blade.start();

  return {
    /** police = {nearest: metres or null, searching, heli: metres or null}. */
    update(police) {
      const at = ctx.currentTime;
      const near = police.nearest === null ? 0 : 1 / (1 + police.nearest / 25);
      sirenGain.gain.setTargetAtTime(near * (police.searching ? 0.5 : 1), at, 0.3);
      wail.frequency.setTargetAtTime(police.nearest !== null && police.nearest < 30 ? 2.2 : 0.28, at, 0.5);
      const air = police.heli === null ? 0 : 1 / (1 + police.heli / 30);
      chop.gain.setTargetAtTime(air * 0.6, at, 0.4);
      bladeDepth.gain.setTargetAtTime(air * 0.6, at, 0.4);
    },
  };
}
