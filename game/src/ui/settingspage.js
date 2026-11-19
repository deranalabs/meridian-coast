// Settings page: volume bar, sound on/off and minimap size; the title screen and the pause menu share it.
import { createMenuList } from './menulist.js';

/** Ten-notch volume bar as HTML. */
export function volumeBar(volume) {
  const lit = Math.round(volume * 10);
  const cells = Array.from({ length: 10 }, (_, i) => `<i class="${i < lit ? 'on' : ''}"></i>`).join('');
  return `<span class="bar">${cells}</span> ${Math.round(volume * 100)}%`;
}

/** createSettingsPage(parent, settings, onEvent) → { root, show(), hide(), handle(input) → 'back' | null }. */
export function createSettingsPage(parent, settings, onEvent = () => {}) {
  const root = document.createElement('div');
  root.className = 'menu-page settings-page';
  root.innerHTML = '<h2>Settings</h2>';
  parent.appendChild(root);
  const arrows = (text) => `<b>&#9666;</b> ${text} <b>&#9656;</b>`;
  const list = createMenuList(root, [
    { id: 'volume', label: 'Master volume', value: () => arrows(volumeBar(settings.get().volume)) },
    { id: 'muted', label: 'Sound', value: () => arrows(settings.get().muted ? 'Muted' : 'On') },
    { id: 'minimap', label: 'Minimap size', value: () => arrows(settings.get().minimap) },
    { id: 'back', label: 'Back' },
  ]);
  const note = document.createElement('div');
  note.className = 'menu-note';
  note.textContent = '← → change   Enter toggle   Esc back';
  root.appendChild(note);

  return {
    root,
    show() {
      root.classList.add('open');
      list.index = 0;
      list.render();
    },
    hide() {
      root.classList.remove('open');
    },
    handle(input) {
      const ask = list.handle(input);
      if (!ask) return null;
      if (ask.action === 'move') onEvent('move');
      if (ask.id === 'back' && ask.action !== 'move') return 'back';
      if (ask.action === 'change' || (ask.action === 'choose' && ask.id !== 'back')) {
        settings.change(ask.id, ask.direction);
        list.render();
        onEvent('select');
      }
      return null;
    },
  };
}
