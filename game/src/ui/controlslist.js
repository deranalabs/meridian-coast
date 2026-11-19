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

/** A one-line reminder for the bottom of the title screen. */
export function controlsLine() {
  const pick = [['Enter', 'start'], ['WASD', 'move'], ['E', 'car / shop'], ['Q', 'aim'], ['F', 'fire'],
    ['Esc', 'pause'], ['M', 'mute']];
  return pick.map(([k, what]) => `<kbd>${k}</kbd> ${what}`).join(' &nbsp; ');
}
