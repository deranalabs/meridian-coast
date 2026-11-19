// Pause menu: Resume, Settings, Controls, Save and Quit to title over the frozen city, driven by the keyboard.
import { CITY_NAME } from '../palette.js';
import { createMenuList } from './menulist.js';
import { createSettingsPage } from './settingspage.js';
import { controlsHtml } from './controlslist.js';

/**
 * createPauseMenu({ settings, place, onSave, onQuit, onEvent }) → { open(), close(), isOpen(), update(input) }.
 * place() names where Ilo is; onSave() returns the line to show; update() returns 'resume' when the menu closes.
 */
export function createPauseMenu({ settings, place = () => '', standing = () => '', onSave, onQuit,
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

  const state = { open: false, page: 'main', confirmQuit: false };
  function show(page) {
    state.page = page;
    main.classList.toggle('open', page === 'main');
    controls.classList.toggle('open', page === 'controls');
    if (page === 'settings') settingsPage.show();
    else settingsPage.hide();
  }

  return {
    root,
    isOpen: () => state.open,
    open() {
      state.open = true;
      state.confirmQuit = false;
      where.textContent = place();
      root.querySelector('.standing').innerHTML = standing();
      note.textContent = '';
      list.index = 0;
      list.render();
      show('main');
      root.classList.add('open');
    },
    close() {
      state.open = false;
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
      if (state.page === 'controls') {
        if (input.pressed('Escape') || input.pressed('Enter') || input.pressed('Backspace')) {
          onEvent('close');
          show('main');
        }
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
      if (ask.id === 'settings' || ask.id === 'controls') {
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
