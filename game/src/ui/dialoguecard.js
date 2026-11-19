// Dialogue card: the speaker's portrait, name and role, the typewriter line and the skip hint, at the screen's foot.
import { portraitCanvas } from './portrait.js';
import { FACTION_INFO, FACTIONS, UI_TOKENS } from '../palette.js';

const PORTRAIT = 132;

function accentOf(person) {
  if (!person) return UI_TOKENS.gold;
  return FACTION_INFO[person.faction]?.colour ?? FACTIONS[person.faction] ?? UI_TOKENS.gold;
}

/** The card inside `parent`; update(person, text, complete) shows a line, update(null) hides the card. */
export function createDialogueCard(parent) {
  const root = document.createElement('div');
  root.className = 'dialogue-card';
  root.innerHTML = '<canvas class="dc-face"></canvas><div class="dc-body"><div class="dc-name"></div>'
    + '<div class="dc-role"></div><div class="dc-line"></div></div>'
    + '<div class="dc-skip"><kbd>Enter</kbd> skip</div>';
  parent.appendChild(root);
  const face = root.querySelector('.dc-face');
  face.width = PORTRAIT;
  face.height = PORTRAIT;
  const faceCtx = face.getContext('2d');
  const name = root.querySelector('.dc-name');
  const role = root.querySelector('.dc-role');
  const line = root.querySelector('.dc-line');
  const skip = root.querySelector('.dc-skip');
  const shown = { id: null, text: null, complete: null };

  return {
    root,
    update(person, text = '', complete = false) {
      const id = person?.id ?? null;
      root.classList.toggle('show', Boolean(person));
      if (!person) {
        shown.id = null;
        return;
      }
      if (id !== shown.id) {
        shown.id = id;
        faceCtx.clearRect(0, 0, PORTRAIT, PORTRAIT);
        faceCtx.drawImage(portraitCanvas(person, PORTRAIT), 0, 0);
        name.textContent = person.name;
        role.textContent = person.role;
        root.style.setProperty('--dc-accent', accentOf(person));
        root.classList.toggle('player', id === 'ilo');
      }
      if (text !== shown.text) {
        shown.text = text;
        line.textContent = text;
      }
      if (complete !== shown.complete) {
        shown.complete = complete;
        skip.innerHTML = complete ? '<kbd>Enter</kbd> next' : '<kbd>Enter</kbd> skip';
      }
    },
  };
}
