// Radio beds: one procedural looping pattern per station (tempo, key, bass, chords, lead, drums), plus note math.

export const SCALES = Object.freeze({
  minor: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
});

/** Equal-tempered pitch of a MIDI note (69 = A4 = 440 Hz). */
export const midiToHz = (note) => 440 * 2 ** ((note - 69) / 12);

/** MIDI note of a scale degree (0-based, may go past 6 or below 0 into other octaves). */
export function degreeNote(root, scale, degree) {
  const steps = SCALES[scale];
  const octave = Math.floor(degree / steps.length);
  const index = ((degree % steps.length) + steps.length) % steps.length;
  return root + octave * 12 + steps[index];
}

/** Seconds per pattern step: a sixteenth note, or an eighth for waltz-time stations. */
export const stepSeconds = (station) => 60 / station.bpm / (station.stepsPerBeat ?? 4);

const _ = null;

/**
 * Index-matched with STATIONS in ui/radio.js. Lines of `bass` and `lead` are scale degrees per step (null = rest);
 * `chords` holds one triad of degrees per bar; `kick` and `hat` list the steps that hit.
 */
export const STATION_BEDS = Object.freeze([
  {
    id: 'coral', bpm: 104, root: 45, scale: 'minor', steps: 16, waves: { bass: 'sawtooth', lead: 'square' },
    bass: [0, _, 0, _, 0, _, 7, _, 5, _, 5, _, 3, _, 4, _],
    chords: [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]],
    lead: [_, _, 11, _, 9, _, 7, _, _, _, 9, _, 11, 12, _, _],
    kick: [0, 4, 8, 12], hat: [2, 6, 10, 14], snare: [4, 12],
  },
  {
    id: 'kdrift', bpm: 124, root: 40, scale: 'phrygian', steps: 16, waves: { bass: 'square', lead: 'sawtooth' },
    bass: [0, 0, 7, 0, 0, 1, 0, 7, 0, 0, 7, 0, 3, 1, 0, _],
    chords: [[0, 2, 4], [0, 2, 4], [1, 3, 5], [-1, 1, 3]],
    lead: [7, _, _, 8, _, _, 7, _, 10, _, _, 8, _, 7, _, _],
    kick: [0, 4, 8, 12], hat: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], snare: [4, 12],
  },
  {
    id: 'calder', bpm: 92, root: 53, scale: 'major', steps: 12, stepsPerBeat: 2,
    waves: { bass: 'triangle', lead: 'triangle' },
    bass: [0, _, _, _, _, _, 4, _, _, _, _, _],
    chords: [[0, 2, 4], [3, 5, 7], [4, 6, 8], [0, 2, 4]],
    lead: [7, 9, 11, 9, 7, _, 8, 7, 6, 4, 2, _],
    kick: [], hat: [], snare: [],
  },
  {
    id: 'talk', bpm: 70, root: 50, scale: 'dorian', steps: 16, talk: true, waves: { bass: 'sine', lead: 'square' },
    bass: [0, _, _, _, _, _, _, _, 3, _, _, _, _, _, _, _],
    chords: [[0, 2, 4], [3, 5, 7]],
    lead: [],
    kick: [], hat: [], snare: [],
  },
]);

/** The bed for a station index (wraps). */
export const bedFor = (index) => {
  const n = STATION_BEDS.length;
  return STATION_BEDS[((index % n) + n) % n];
};

/** What plays on one step: { bass, lead, chord, kick, hat, snare } with MIDI notes or null, booleans for drums. */
export function stepEvents(bed, step) {
  const s = step % bed.steps;
  const bar = Math.floor(step / bed.steps) % bed.chords.length;
  const note = (degree, octave) => (degree === null || degree === undefined
    ? null : degreeNote(bed.root + octave * 12, bed.scale, degree));
  return {
    bass: note(bed.bass[s], 0),
    lead: bed.lead.length ? note(bed.lead[s], 1) : null,
    chord: s === 0 ? bed.chords[bar].map((d) => note(d, 1)) : null,
    kick: bed.kick.includes(s),
    hat: bed.hat.includes(s),
    snare: bed.snare.includes(s),
  };
}

/** Talk radio hosts: who speaks and what (spoken as voice blips). */
export const TALK_LINES = Object.freeze([
  ['dawn-ruiz', 'Caller, you are on the air with Late Calls on the Coast.'],
  ['caller-ray', 'Yeah, hi, somebody parked a boat on my driveway again.'],
  ['dawn-ruiz', 'Again? How does that even happen in Calder Heights?'],
  ['caller-ray', 'Ask the tide, Dawn. Ask the tide!'],
  ['ben-achterberg', 'Traffic on the Gull Key Causeway is backed up past the lighthouse.'],
  ['dawn-ruiz', 'Stay cool out there, Port Meridian.'],
]);
