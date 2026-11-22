// Every key the game reads, grouped for the Controls screen; the title line and the pause menu both use it.

export const CONTROLS = Object.freeze([
  ['On foot', [
    [['W', 'A', 'S', 'D'], 'Move'],
    [['Shift'], 'Run'],
    [['C'], 'Crouch'],
    [['E'], 'Take a car, use a shop or door'],
    [['Mouse'], 'Look (click to lock the pointer)'],
  ]],
  ['Combat', [
    [['Q'], 'Aim (hold)'],
    [['F', 'Click'], 'Fire or punch'],
    [['1', '2', '3', '4'], 'Fists, Harbor 9, Ratchet SMG, Breaker 12'],
    [['Tab', 'Wheel'], 'Next weapon'],
    [['R'], 'Reload'],
  ]],
  ['Driving', [
    [['W', 'S'], 'Throttle, brake and reverse'],
    [['A', 'D'], 'Steer'],
    [['Space'], 'Handbrake'],
    [['E'], 'Get out (when slow)'],
    [['R'], 'Next radio station'],
  ]],
  ['Menus', [
    [['Esc'], 'Pause, back, leave a shop'],
    [['↑', '↓', 'Enter'], 'Choose and confirm'],
    [['←', '→'], 'Change a setting'],
    [['M'], 'Mute sound'],
    [['N'], 'Full map (WASD pan, +/− or wheel zoom, Space finds you)'],
  ]],
  ['Story', [
    [['P'], 'Phone: contacts, jobs, rank'],
    [['E'], 'Meet the contact at a gold pillar'],
    [['Enter'], 'Skip a line, retry a failed job'],
    [['Backspace'], 'Call a failed job off'],
  ]],
]);

const escapeText = (text) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

/** The Controls screen body: one column per group, each line its keys and what they do. */
export function controlsHtml() {
  return CONTROLS.map(([group, lines]) => `<div class="keys-group"><h3>${group}</h3>${lines.map(([keys, what]) =>
    `<div class="keys-line"><span>${keys.map((k) => `<kbd>${escapeText(k)}</kbd>`).join('')}</span>`
    + `<em>${escapeText(what)}</em></div>`).join('')}</div>`).join('');
}

/** The keys of a first session, for the title screen's legend: a reviewer reads this and not the README. */
export const TITLE_KEYS = Object.freeze([
  [['W A S D', 'or arrows'], 'move, drive'],
  [['Shift'], 'run'],
  [['Space'], 'handbrake in a car'],
  [['E'], 'enter a car, talk, shop'],
  [['Mouse'], 'look and aim'],
  [['Click'], 'fire or punch'],
  [['Q'], 'aim (hold)'],
  [['1-4'], 'weapons'],
  [['R'], 'reload, radio in a car'],
  [['P'], 'phone'],
  [['N'], 'map'],
  [['Esc'], 'pause'],
]);

/** The title's legend: one row a key; a second entry under the same key is a plain word, not a cap. */
export function controlsLegend() {
  return `<h3>Keys</h3>${TITLE_KEYS.map(([[cap, also], what]) => `<div class="legend-row"><span><kbd>${cap}</kbd>`
    + `${also ? `<small>${escapeText(also)}</small>` : ''}</span><em>${escapeText(what)}</em></div>`).join('')}`;
}

/** The free-roam hint under the next job: until the first is done it teaches E, then the phone as well. */
export function roamHint(jobsDone) {
  return jobsDone
    ? 'Press <kbd>E</kbd> at the gold pillar, or <kbd>P</kbd> for the phone'
    : '<kbd>E</kbd> takes a car, or talks at the gold pillar';
}
