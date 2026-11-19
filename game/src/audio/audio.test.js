// Unit tests for the pure parts of the audio: volume clamp and mute, engine revs, distance fall-off, notes, voices.
import test from 'node:test';
import assert from 'node:assert/strict';
import { clampVolume, masterLevel, createMixer } from './mixer.js';
import { engineRevs, engineTone } from './engine.js';
import { distanceGain, sirenSweep } from './siren.js';
import { midiToHz, degreeNote, STATION_BEDS, stepEvents, stepSeconds } from './stations.js';
import { voiceOf, voicePattern, syllables } from './voice.js';
import { shotProfile } from './sfx.js';
import { STATIONS } from '../ui/radio.js';

test('volume clamps to 0..1 and junk falls back', () => {
  assert.equal(clampVolume(1.7), 1);
  assert.equal(clampVolume(-2), 0);
  assert.equal(clampVolume('0.25'), 0.25);
  assert.equal(clampVolume('loud', 0.6), 0.6);
  assert.equal(clampVolume(undefined, 0.4), 0.4);
  assert.equal(masterLevel(0.8, true), 0);
  assert.equal(masterLevel(0.8, false, 0.5), 0.4);
});

test('the mixer toggles mute and keeps its volume without an audio context', () => {
  const mixer = createMixer({ volume: 3, muted: false });
  assert.equal(mixer.volume, 1);
  assert.equal(mixer.ctx, null);
  assert.equal(mixer.toggleMute(), true);
  assert.equal(mixer.toggleMute(), false);
  mixer.setVolume(0.3);
  assert.equal(mixer.volume, 0.3);
  mixer.setVolume('nonsense');
  assert.equal(mixer.volume, 0.3);
});

test('engine revs climb through a gear and drop at each shift', () => {
  assert.ok(engineRevs(0.15) > engineRevs(0.05));
  assert.ok(engineRevs(0.17) < engineRevs(0.15), 'shift into second drops the revs');
  assert.ok(engineRevs(1) <= 1 && engineRevs(-0.5) === engineRevs(0.5));
  assert.ok(engineTone(0.5, 1).level > engineTone(0.5, 0).level);
});

test('distance gain is full up close, zero far away and falls in between', () => {
  assert.equal(distanceGain(5, 12, 200), 1);
  assert.equal(distanceGain(250, 12, 200), 0);
  assert.equal(distanceGain(Infinity), 0);
  assert.ok(distanceGain(40) > distanceGain(120));
  assert.ok(sirenSweep(20, false).rate > sirenSweep(100, false).rate, 'yelp close, wail far');
  assert.ok(sirenSweep(20, true).rate < 0.5, 'searching units wail slowly');
});

test('note math: A4 is 440 Hz and scale degrees wrap into octaves', () => {
  assert.equal(midiToHz(69), 440);
  assert.ok(Math.abs(midiToHz(81) - 880) < 1e-9);
  assert.equal(degreeNote(57, 'minor', 0), 57);
  assert.equal(degreeNote(57, 'minor', 2), 60);
  assert.equal(degreeNote(57, 'minor', 7), 69);
  assert.equal(degreeNote(57, 'minor', -1), 55);
});

test('every radio station has its own bed, tempo and pattern', () => {
  assert.equal(STATION_BEDS.length, STATIONS.length);
  const tempos = new Set(STATION_BEDS.map((bed) => bed.bpm));
  assert.equal(tempos.size, STATION_BEDS.length);
  for (const bed of STATION_BEDS) {
    assert.equal(bed.bass.length, bed.steps);
    if (bed.lead.length) assert.equal(bed.lead.length, bed.steps);
    assert.ok(stepSeconds(bed) > 0.05 && stepSeconds(bed) < 0.6);
    const first = stepEvents(bed, 0);
    assert.equal(first.chord.length, 3);
    assert.equal(stepEvents(bed, 1).chord, null);
  }
  assert.equal(stepEvents(STATION_BEDS[0], 0).kick, true);
});

test('voice patterns are stable per character and follow the text', () => {
  assert.deepEqual(voiceOf('ilo'), voiceOf('ilo'));
  assert.notEqual(voiceOf('ilo').base, voiceOf('marisol').base);
  assert.equal(syllables('Meridian'), 3, 'vowel groups: e, i, ia');
  assert.equal(syllables('harbor'), 2);
  assert.equal(syllables('rhythm'), 1);
  const short = voicePattern('ilo', 'Hey.');
  const long = voicePattern('ilo', 'Meet me at the harbor, after dark.');
  assert.ok(long.blips.length > short.blips.length);
  assert.ok(long.length > short.length);
  assert.deepEqual(voicePattern('ilo', 'Same line'), voicePattern('ilo', 'Same line'));
  const asked = voicePattern('ilo', 'Ready now?');
  const told = voicePattern('ilo', 'Ready now.');
  assert.ok(asked.blips.at(-1).freq > told.blips.at(-1).freq, 'a question rises at the end');
  assert.ok(voicePattern('ilo', 'word '.repeat(80)).blips.length <= 36);
  assert.equal(voicePattern('ilo', '').blips.length, 0);
});

test('unknown weapons fall back to the pistol shot', () => {
  assert.equal(shotProfile('harpoon'), shotProfile('pistol'));
  assert.ok(shotProfile('shotgun').decay > shotProfile('smg').decay);
});
