// Radio bed player: schedules the current station's pattern a little ahead on voices that are built only once.
import { noiseSource } from './mixer.js';
import { bedFor, stepEvents, stepSeconds, midiToHz, TALK_LINES } from './stations.js';
import { voicePattern } from './voice.js';

const LOOKAHEAD = 0.15;

/** Creates the bed; update(stationIndex, playing) is cheap and allocation-free between steps. */
export function createRadioBed(mixer) {
  let v = null;
  const play = { station: -1, step: 0, next: 0, on: false, talkLine: 0, talkUntil: 0 };

  mixer.whenReady((ctx) => {
    const voice = (type, filterType, cutoff) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = cutoff;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(out);
      osc.start();
      return { osc, filter, gain };
    };
    const out = ctx.createGain();
    out.gain.value = 0;
    // A narrow band-pass and a touch of drive make the bed sound like it comes out of a car radio.
    const speaker = ctx.createBiquadFilter();
    speaker.type = 'bandpass';
    speaker.frequency.value = 1100;
    speaker.Q.value = 0.35;
    out.connect(speaker).connect(mixer.bus.radio);
    const hatFilter = ctx.createBiquadFilter();
    hatFilter.type = 'highpass';
    hatFilter.frequency.value = 7000;
    const hat = ctx.createGain();
    hat.gain.value = 0;
    noiseSource(mixer).connect(hatFilter).connect(hat).connect(out);
    const snareFilter = ctx.createBiquadFilter();
    snareFilter.type = 'bandpass';
    snareFilter.frequency.value = 1800;
    const snare = ctx.createGain();
    snare.gain.value = 0;
    noiseSource(mixer).connect(snareFilter).connect(snare).connect(out);
    v = {
      out,
      bass: voice('sawtooth', 'lowpass', 700),
      lead: voice('square', 'lowpass', 2400),
      pad: [0, 1, 2].map(() => voice('triangle', 'lowpass', 1500)),
      kick: voice('sine', 'lowpass', 400),
      hat,
      snare,
    };
  });

  function hit(gain, t, peak, decay) {
    gain.setTargetAtTime(peak, t, 0.004);
    gain.setTargetAtTime(0, t + 0.012, decay);
  }

  function scheduleStep(bed, t, length) {
    const e = stepEvents(bed, play.step);
    if (e.bass !== null) {
      v.bass.osc.frequency.setValueAtTime(midiToHz(e.bass), t);
      hit(v.bass.gain.gain, t, 0.3, length * 1.2);
    }
    if (e.lead !== null) {
      v.lead.osc.frequency.setValueAtTime(midiToHz(e.lead), t);
      hit(v.lead.gain.gain, t, 0.09, length * 1.6);
    }
    if (e.chord) {
      for (let i = 0; i < 3; i += 1) {
        v.pad[i].osc.frequency.setTargetAtTime(midiToHz(e.chord[i]), t, 0.03);
        v.pad[i].gain.gain.setTargetAtTime(bed.talk ? 0.025 : 0.06, t, 0.08);
      }
    }
    if (e.kick) {
      v.kick.osc.frequency.setValueAtTime(140, t);
      v.kick.osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      hit(v.kick.gain.gain, t, 0.55, 0.07);
    }
    if (e.hat) hit(v.hat.gain, t, 0.07, 0.02);
    if (e.snare) hit(v.snare.gain, t, 0.22, 0.05);
    if (bed.talk && t >= play.talkUntil) scheduleTalk(t);
  }

  /** Talk radio: the lead voice speaks the next host line as blips, then a short gap. */
  function scheduleTalk(t) {
    const [who, line] = TALK_LINES[play.talkLine % TALK_LINES.length];
    play.talkLine += 1;
    const pattern = voicePattern(who, line);
    v.lead.osc.type = pattern.voice.wave;
    for (const blip of pattern.blips) {
      v.lead.osc.frequency.setValueAtTime(blip.freq, t + blip.at);
      hit(v.lead.gain.gain, t + blip.at, 0.12 * blip.level, blip.dur * 0.5);
    }
    play.talkUntil = t + pattern.length + 0.9;
  }

  function switchTo(index, now) {
    const bed = bedFor(index);
    play.station = index;
    play.step = 0;
    play.next = now + 0.08;
    play.talkUntil = 0;
    v.bass.osc.type = bed.waves.bass;
    v.lead.osc.type = bed.waves.lead;
    for (const part of [v.bass, v.lead, v.kick, ...v.pad]) {
      part.gain.gain.cancelScheduledValues(now);
      part.gain.gain.setTargetAtTime(0, now, 0.02);
    }
  }

  return {
    state: play,
    update(stationIndex, playing) {
      if (!v) return;
      const now = mixer.ctx.currentTime;
      if (playing !== play.on) {
        play.on = playing;
        v.out.gain.setTargetAtTime(playing ? 1 : 0, now, playing ? 0.3 : 0.12);
        if (playing) play.station = -1;
      }
      if (!playing) return;
      if (stationIndex !== play.station) switchTo(stationIndex, now);
      const bed = bedFor(stationIndex);
      const length = stepSeconds(bed);
      if (play.next < now) play.next = now + 0.02;
      while (play.next < now + LOOKAHEAD) {
        scheduleStep(bed, play.next, length);
        play.next += length;
        play.step += 1;
      }
    },
  };
}
