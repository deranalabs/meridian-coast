// Title screen: the Meridian Coast logo, tagline and menu (continue with its save card, story, free roam, settings,
// controls) over the live city.
import { GAME_TITLE, CITY_NAME } from '../palette.js';
import { createMenuList } from './menulist.js';
import { saveCardText } from './savecard.js';
import { createSettingsPage } from './settingspage.js';
import { controlsHtml, controlsLegend } from './controlslist.js';

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
#title .legend { position: absolute; top: 24px; right: 24px; box-sizing: border-box; width: 344px;
  padding: 10px 16px 12px; border-radius: 10px; background: rgba(14, 8, 30, 0.82); color: #fff6e8; }
#title .legend h3 { margin: 0 0 6px; font-size: 15px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--mc-gold, #ffc94a); }
#title .legend:empty { display: none; }
#title .legend-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  margin-top: 4px; font-size: 15px; line-height: 22px; white-space: nowrap; }
#title .legend-row small { font-size: inherit; margin-left: 2px; }
#title .legend-row em { font-style: normal; font-weight: 700; }
#title.sub .legend { display: none; }
#title kbd { display: inline-block; padding: 1px 8px; margin: 0 3px; border-radius: 5px; background: #fff;
  color: #2a1640; font-family: inherit; font-weight: 800; }
#title .title-menu { display: flex; align-items: flex-start; gap: 40px; }
#title .save-card { margin-top: 2px; padding: 12px 22px 14px 20px; min-width: 330px; border-radius: 10px;
  background: var(--mc-ui-deep, rgba(14, 8, 30, 0.8)); border-left: 6px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); }
#title .save-card.active { border-left-color: var(--mc-gold, #ffc94a);
  box-shadow: 0 0 0 1px rgba(255, 201, 74, 0.4), 0 0 26px rgba(255, 79, 160, 0.35); }
#title .save-card .slot { font-size: 21px; letter-spacing: 3px; font-weight: 800; color: #ffd1e6;
  text-transform: uppercase; }
#title .save-card .chapter { font-size: 38px; font-weight: 900; line-height: 1.05; margin-top: 6px; }
#title .save-card .mission { font-size: 31px; font-weight: 800; font-style: italic; color: #ffb48a; }
#title .save-card .money { display: flex; align-items: baseline; gap: 18px; margin-top: 4px; }
#title .save-card .cash { font-size: 36px; font-weight: 900; color: var(--mc-cash, #9dffb5); }
#title .save-card .saved { font-size: 24px; font-weight: 700; color: #fff6e8; }
#title.sub .tagline, #title.sub .title-menu { display: none; }
#title .menu-page { max-width: 560px; }
#title.hidden { display: none; }
@media (max-height: 560px) { #title .logo { font-size: 64px; } #title .tagline { font-size: 15px;
  margin-bottom: 14px; } #title .title-list li { font-size: 18px; margin: 4px 0; }
  #title .save-card { padding: 8px 14px 9px 12px; min-width: 240px; } #title .save-card .slot { font-size: 13px; }
  #title .save-card .chapter { font-size: 24px; } #title .save-card .mission { font-size: 19px; }
  #title .save-card .cash { font-size: 22px; } #title .save-card .saved { font-size: 14px; } }
/* In a small window the legend keeps the right edge and the menu, with any save card, stays left of it. */
@media (max-width: 900px) { #title { padding-left: 26px; } #title .legend { top: 14px; right: 14px; width: 262px;
    padding: 8px 10px 9px; }
  #title .legend h3 { font-size: 13px; margin-bottom: 3px; }
  #title .legend-row { font-size: 13px; line-height: 19px; margin-top: 3px; }
  #title .legend-row kbd { padding: 1px 5px; margin: 0 1px; }
  #title .tagline { max-width: 420px; } #title .kicker { font-size: 13px; letter-spacing: 4px; }
  #title .title-menu { gap: 18px; } #title .save-card { min-width: 0; }
  #title .save-card .chapter { font-size: 20px; } #title .save-card .mission { font-size: 16px; }
  #title .save-card .money { flex-wrap: wrap; row-gap: 0; column-gap: 12px; } }
`;

/** The card beside Continue: slot and rank, the mission the story stands at, cash and when it was saved. */
function createSaveCard(parent, save) {
  const card = document.createElement('div');
  card.className = 'save-card';
  const text = saveCardText(save);
  card.innerHTML = '<div class="slot"></div><div class="chapter"></div><div class="mission"></div>'
    + '<div class="money"><span class="cash"></span><span class="saved"></span></div>';
  for (const key of ['slot', 'chapter', 'mission', 'cash', 'saved']) {
    card.querySelector(`.${key}`).textContent = text[key];
  }
  parent.appendChild(card);
  return card;
}

/**
 * Show the title; update(input) runs its menu and returns true once a game mode is chosen.
 * `still` (shot scenes) hides the controls line; settings is the live settings store, onEvent plays menu sounds.
 * `save` (a parsed save, or null) adds Continue first with its card; onStart(mode) runs when the title closes.
 */
export function createTitleScreen(still, { settings = null, onEvent = () => {}, save = null,
  onStart = () => {} } = {}) {
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
  const shown = settings ? items : items.slice(0, 2);
  const menu = document.createElement('div');
  menu.className = 'title-menu';
  root.appendChild(menu);
  const list = createMenuList(menu, save ? [{ id: 'continue', label: 'Continue' }, ...shown] : shown, 'title-list');
  const card = save ? createSaveCard(menu, save) : null;
  const markCard = () => card?.classList.toggle('active', list.items[list.index].id === 'continue');
  markCard();
  const settingsPage = settings ? createSettingsPage(root, settings, onEvent) : null;
  const keys = document.createElement('div');
  keys.className = 'menu-page controls-page';
  keys.innerHTML = `<h2>Controls</h2><div class="keys">${controlsHtml()}</div><div class="menu-note">Esc back</div>`;
  root.appendChild(keys);
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = still ? '' : controlsLegend();
  root.appendChild(legend);

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
    /** 'continue', 'story' or 'free' once chosen, else null. */
    mode: () => state.mode,
    close(mode = 'story') {
      state.open = false;
      state.mode = mode;
      root.classList.add('hidden');
      if (hud) hud.style.visibility = 'visible';
      onStart(mode);
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
      if (ask.action === 'move') {
        onEvent('move');
        markCard();
      }
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
