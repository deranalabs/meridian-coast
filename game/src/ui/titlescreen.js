// Title screen: the Meridian Coast logo, tagline and menu (story, free roam, settings, controls) over the live city.
import { GAME_TITLE, CITY_NAME } from '../palette.js';
import { createMenuList } from './menulist.js';
import { createSettingsPage } from './settingspage.js';
import { controlsHtml, controlsLine } from './controlslist.js';

const STYLE = `
#title { position: fixed; inset: 0; display: flex; flex-direction: column; justify-content: center;
  padding-left: 7vw; pointer-events: none; font-family: "Avenir Next", Futura, "Helvetica Neue", Arial, sans-serif;
  color: #fff; background: linear-gradient(90deg, rgba(18, 6, 34, 0.78) 0%, rgba(18, 6, 34, 0.35) 42%,
  rgba(18, 6, 34, 0) 70%); }
#title .kicker { font-size: 17px; letter-spacing: 9px; font-weight: 700; color: #ffd1e6; text-transform: uppercase; }
#title .logo { font-size: 104px; line-height: 0.92; font-weight: 900; font-style: italic; letter-spacing: -2px;
  margin: 10px 0 6px; background: linear-gradient(180deg, #fff6e8 0%, #ffb48a 45%, #ff4fa0 72%, #c45cff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 6px 18px rgba(255, 79, 160, 0.55)); }
#title .tagline { font-size: 21px; font-weight: 600; color: #f4e8ff; max-width: 520px; margin-bottom: 34px; }
#title .title-list { list-style: none; margin: 0; padding: 0; }
#title .title-list li { font-size: 25px; font-weight: 800; letter-spacing: 2px; margin: 8px 0;
  color: rgba(255,255,255,0.72); }
#title .title-list li.active { color: #fff; text-shadow: 0 0 16px #ff4fa0; }
#title .title-list li.active::before { content: "\\25B6"; color: var(--mc-gold, #3fe0d0); margin-right: 14px;
  font-size: 18px; vertical-align: middle; }
#title .controls { position: absolute; bottom: 34px; left: 7vw; font-size: 15px; color: #e8dcf4; }
#title kbd { display: inline-block; padding: 1px 8px; margin: 0 3px; border-radius: 5px; background: #fff;
  color: #2a1640; font-family: inherit; font-weight: 800; }
#title.sub .tagline, #title.sub .title-list { display: none; }
#title .menu-page { max-width: 560px; }
#title.hidden { display: none; }
@media (max-height: 560px) { #title .logo { font-size: 64px; } #title .tagline { font-size: 15px;
  margin-bottom: 14px; } #title .title-list li { font-size: 18px; margin: 4px 0; } }
`;

/**
 * Show the title; update(input) runs its menu and returns true once a game mode is chosen.
 * `still` (shot scenes) hides the controls line; settings is the live settings store, onEvent plays menu sounds.
 */
export function createTitleScreen(still, { settings = null, onEvent = () => {} } = {}) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'title';
  root.innerHTML = `
    <div class="kicker">${CITY_NAME} &middot; Episode One</div>
    <div class="logo">${GAME_TITLE.replace(' ', '<br>')}</div>
    <div class="tagline">Ilo Rask owes the wrong people on the right side of town. The coast is pink at dusk
      and nobody here is who they say.</div>`;
  document.body.appendChild(root);
  const items = [{ id: 'story', label: 'Start Story' }, { id: 'free', label: 'Free Roam' },
    { id: 'settings', label: 'Settings' }, { id: 'controls', label: 'Controls' }];
  const list = createMenuList(root, settings ? items : items.slice(0, 2), 'title-list');
  const settingsPage = settings ? createSettingsPage(root, settings, onEvent) : null;
  const keys = document.createElement('div');
  keys.className = 'menu-page controls-page';
  keys.innerHTML = `<h2>Controls</h2><div class="keys">${controlsHtml()}</div><div class="menu-note">Esc back</div>`;
  root.appendChild(keys);
  const line = document.createElement('div');
  line.className = 'controls';
  line.innerHTML = still ? '' : controlsLine();
  root.appendChild(line);

  const hud = document.getElementById('hud');
  if (hud) hud.style.visibility = 'hidden';
  const state = { open: true, page: 'main', mode: null };
  function show(page) {
    state.page = page;
    root.classList.toggle('sub', page !== 'main');
    keys.classList.toggle('open', page === 'controls');
    if (page === 'settings') settingsPage.show();
    else settingsPage?.hide();
  }

  const screen = {
    isOpen: () => state.open,
    /** 'story' or 'free' once chosen, else null. */
    mode: () => state.mode,
    close(mode = 'story') {
      state.open = false;
      state.mode = mode;
      root.classList.add('hidden');
      if (hud) hud.style.visibility = 'visible';
    },
    update(input) {
      if (!state.open) return false;
      if (state.page === 'settings') {
        if (settingsPage.handle(input) === 'back') show('main');
        return false;
      }
      if (state.page === 'controls') {
        if (input.pressed('Escape') || input.pressed('Enter') || input.pressed('Backspace')) show('main');
        return false;
      }
      const ask = list.handle(input);
      if (!ask || ask.action === 'back') return false;
      if (ask.action === 'move') onEvent('move');
      if (ask.action !== 'choose') return false;
      if (ask.id === 'settings' || ask.id === 'controls') {
        onEvent('open');
        show(ask.id);
        return false;
      }
      onEvent('buy');
      screen.close(ask.id);
      return true;
    },
  };
  return screen;
}
