// Title screen: the Meridian Coast logo, tagline, menu and controls over a live view of the city.
import { GAME_TITLE, CITY_NAME } from '../palette.js';

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
#title ul { list-style: none; margin: 0; padding: 0; }
#title li { font-size: 25px; font-weight: 800; letter-spacing: 2px; margin: 8px 0; color: rgba(255,255,255,0.72); }
#title li.active { color: #fff; text-shadow: 0 0 16px #ff4fa0; }
#title li.active::before { content: "\\25B6"; color: #3fe0d0; margin-right: 14px; font-size: 18px;
  vertical-align: middle; }
#title .controls { position: absolute; bottom: 34px; left: 7vw; font-size: 15px; color: #e8dcf4; }
#title kbd { display: inline-block; padding: 1px 8px; margin: 0 3px; border-radius: 5px; background: #fff;
  color: #2a1640; font-family: inherit; font-weight: 800; }
#title.hidden { display: none; }
`;

/** Show the title; isOpen() until close() (Enter starts the game). `still` hides the controls line. */
export function createTitleScreen(still) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'title';
  root.innerHTML = `
    <div class="kicker">${CITY_NAME} &middot; Episode One</div>
    <div class="logo">${GAME_TITLE.replace(' ', '<br>')}</div>
    <div class="tagline">Ilo Rask owes the wrong people on the right side of town. The coast is pink at dusk
      and nobody here is who they say.</div>
    <ul>
      <li class="active">Start Story</li>
      <li>Free Roam</li>
      <li>Settings</li>
    </ul>
    <div class="controls">${still ? '' : 'Press '}<kbd>Enter</kbd> start &nbsp; <kbd>WASD</kbd> move &nbsp;
      <kbd>Shift</kbd> run &nbsp; <kbd>E</kbd> car / shop &nbsp; <kbd>Space</kbd> handbrake &nbsp; <kbd>R</kbd> radio
      <br><kbd>Q</kbd> aim &nbsp; <kbd>F</kbd> fire &nbsp; <kbd>1</kbd>-<kbd>4</kbd> weapons &nbsp; <kbd>M</kbd> mute</div>`;
  document.body.appendChild(root);
  const hud = document.getElementById('hud');
  if (hud) hud.style.visibility = 'hidden';
  let open = true;
  return {
    isOpen: () => open,
    close() {
      open = false;
      root.classList.add('hidden');
      if (hud) hud.style.visibility = 'visible';
    },
  };
}
