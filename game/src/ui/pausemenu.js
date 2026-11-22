// Pause menu: Resume, Progress, Settings, Controls, Save and Quit to title over the frozen city, by keyboard.
import { CITY_NAME } from '../palette.js';
import { createMenuList } from './menulist.js';
import { createSettingsPage } from './settingspage.js';
import { controlsHtml } from './controlslist.js';

/** The pages that only show something: Esc, Enter or Backspace goes back to the menu. */
const READ_ONLY_PAGES = ['progress', 'controls'];
const BACK_KEYS = ['Escape', 'Enter', 'Backspace'];

/**
 * createPauseMenu({ settings, place, progressPage, onSave, onQuit, onEvent }) →
 * { open(page), close(), isOpen(), update(input) }.
 * place() names where Ilo is; progressPage(parent) builds the Progress page ({ show, hide, update });
 * onSave() returns the line to show; update() returns 'resume' when the menu closes.
 */
export function createPauseMenu({ settings, place = () => '', standing = () => '', progressPage, onSave, onQuit,
  onEvent = () => {} }) {
  const root = document.createElement('div');
  root.id = 'pause';
  root.innerHTML = `<div class="pause-card"><div class="kicker">${CITY_NAME} &middot; <span class="where"></span></div>
    <div class="big">Paused</div><div class="standing"></div><div class="pages"></div></div>`;
  document.body.appendChild(root);
  const where = root.querySelector('.where');
  const pages = root.querySelector('.pages');

  const main = document.createElement('div');
  main.className = 'menu-page main-page';
  pages.appendChild(main);
  const list = createMenuList(main, [
    { id: 'resume', label: 'Resume' },
    { id: 'progress', label: 'Progress' },
    { id: 'settings', label: 'Settings' },
    { id: 'controls', label: 'Controls' },
    { id: 'save', label: 'Save game' },
    { id: 'quit', label: 'Quit to title' },
  ]);
  const note = document.createElement('div');
  note.className = 'menu-note';
  main.appendChild(note);

  const settingsPage = createSettingsPage(pages, settings, onEvent);
  const controls = document.createElement('div');
  controls.className = 'menu-page controls-page';
  controls.innerHTML = `<h2>Controls</h2><div class="keys">${controlsHtml()}</div>
    <div class="menu-note">Esc or Enter back</div>`;
  pages.appendChild(controls);
  // The Progress page covers the whole screen, so it hangs off the overlay instead of the card.
  const progress = progressPage(root);

  const state = { open: false, page: 'main', confirmQuit: false };
  function show(page) {
    state.page = page;
    main.classList.toggle('open', page === 'main');
    controls.classList.toggle('open', page === 'controls');
    if (page === 'settings') settingsPage.show();
    else settingsPage.hide();
    if (page === 'progress') progress.show();
    else progress.hide();
  }

  return {
    root,
    isOpen: () => state.open,
    /** Open on the menu, or straight on `page`. */
    open(page = 'main') {
      state.open = true;
      state.confirmQuit = false;
      where.textContent = place();
      root.querySelector('.standing').innerHTML = standing();
      note.textContent = '';
      list.index = 0;
      if (page === 'main') list.render();
      else list.select(page);
      root.classList.add('open');
      show(page);
    },
    close() {
      state.open = false;
      progress.hide();
      root.classList.remove('open');
    },
    /** One frame of menu input; 'resume' means the caller should unpause. */
    update(input) {
      if (!state.open) return null;
      if (state.page === 'settings') {
        if (settingsPage.handle(input) === 'back') {
          onEvent('close');
          show('main');
        }
        return null;
      }
      if (READ_ONLY_PAGES.includes(state.page)) {
        if (BACK_KEYS.some((key) => input.pressed(key))) {
          onEvent('close');
          show('main');
        } else if (state.page === 'progress') progress.update();
        return null;
      }
      const ask = list.handle(input);
      if (!ask) return null;
      if (ask.action === 'move') {
        onEvent('move');
        state.confirmQuit = false;
        note.textContent = '';
        return null;
      }
      if (ask.action === 'back' || ask.id === 'resume') {
        this.close();
        return 'resume';
      }
      if (ask.action !== 'choose') return null;
      if (['progress', 'settings', 'controls'].includes(ask.id)) {
        onEvent('open');
        show(ask.id);
      } else if (ask.id === 'save') {
        note.textContent = onSave();
      } else if (ask.id === 'quit') {
        if (!state.confirmQuit) {
          state.confirmQuit = true;
          note.textContent = 'Progress since your last save is lost. Enter again to quit.';
          onEvent('deny');
        } else onQuit();
      }
      return null;
    },
  };
}
