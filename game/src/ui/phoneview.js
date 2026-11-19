// Phone screen view: the handset DOM with rank and respect, contacts with portraits, and the job list.
import { portraitCanvas } from './portrait.js';

const PORTRAIT = 96;

/** A fresh canvas holding a copy of the cached portrait (one canvas element can only sit in one place). */
function portraitCopy(person) {
  const source = portraitCanvas(person, PORTRAIT);
  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT;
  canvas.height = PORTRAIT;
  canvas.getContext('2d').drawImage(source, 0, 0);
  return canvas;
}

/** The name a phone lists: a nickname in quotes, a titled person's surname, otherwise the first name. */
export function shortName(name) {
  const nick = name.match(/"(.+)"/)?.[1];
  if (nick) return nick;
  const words = name.split(' ');
  return words[0].endsWith('.') ? words[words.length - 1] : words[0];
}

function add(parent, tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  parent.appendChild(node);
  return node;
}

/**
 * The phone over `parent`, built once for `contacts` (cast entries) and `jobs` ({ id, number, title, giver,
 * place }). render(model) updates it: { rank, respect, nextRank, nextRespect, done: Set, open: Set,
 * selected (job id), note (status line html) }.
 */
export function createPhoneView(parent, contacts, jobs, castMember) {
  const root = add(parent, 'div', '');
  root.id = 'phone';
  const handset = add(root, 'div', 'handset');
  const top = add(handset, 'div', 'phone-top');
  add(top, 'span', 'carrier', 'MERIDIAN TEL');
  const clock = add(top, 'span', 'clock');
  const header = add(handset, 'div', 'phone-rank');
  const rankName = add(header, 'b');
  const respectText = add(header, 'span');
  const respectBar = add(add(header, 'div', 'bar'), 'i');
  add(handset, 'div', 'phone-kicker', 'Contacts');
  const grid = add(handset, 'div', 'phone-contacts');
  const contactCells = new Map(contacts.map((person) => {
    const cell = add(grid, 'div', 'contact');
    cell.appendChild(portraitCopy(person));
    add(cell, 'b', '', shortName(person.name));
    add(cell, 'small', '', person.role);
    return [person.id, cell];
  }));
  add(handset, 'div', 'phone-kicker', 'Jobs');
  const list = add(handset, 'ul', 'phone-jobs');
  const jobRows = new Map(jobs.map((job) => {
    const row = add(list, 'li', '');
    const giver = castMember(job.giver);
    row.appendChild(portraitCopy(giver));
    const text = add(row, 'div', 'job-text');
    add(text, 'b', '', `${job.number}. ${job.title}`);
    add(text, 'small', '', `${giver.name} · ${job.place}`);
    add(row, 'span', 'job-state');
    return [job.id, row];
  }));
  const note = add(handset, 'div', 'phone-note');
  const keys = add(handset, 'div', 'phone-keys');
  keys.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> choose &nbsp; <kbd>Enter</kbd> take the job &nbsp; '
    + '<kbd>P</kbd> close &nbsp; <kbd>N</kbd> map';
  let last = '';

  return {
    root,
    render(model) {
      const key = JSON.stringify([model.respect, [...model.done], [...model.open], model.selected, model.note,
        model.time]);
      if (key === last) return;
      last = key;
      clock.textContent = model.time;
      rankName.textContent = model.rank;
      respectText.textContent = model.nextRank
        ? `${model.respect} respect · ${model.nextRespect - model.respect} to ${model.nextRank}${
          model.opens ? `, opens ${model.opens}` : ''}`
        : `${model.respect} respect · top rank`;
      const span = model.nextRespect ? model.respect / model.nextRespect : 1;
      respectBar.style.width = `${Math.round(Math.min(1, span) * 100)}%`;
      for (const job of jobs) {
        const row = jobRows.get(job.id);
        const state = model.done.has(job.id) ? 'done' : model.open.has(job.id) ? 'open' : 'locked';
        row.className = `${state}${model.selected === job.id ? ' active' : ''}`;
        row.lastChild.textContent = state === 'done' ? 'Done' : state === 'open' ? 'Ready' : 'Later';
      }
      for (const [id, cell] of contactCells) {
        cell.classList.toggle('has-work', jobs.some((job) => job.giver === id && model.open.has(job.id)));
      }
      note.innerHTML = model.note ?? '';
    },
  };
}
