// Full-map screen on N: the whole of Port Meridian with districts, jobs, shops, landmarks, police and a legend.
import { createProjection } from './mapprojection.js';
import { paintMap } from './mapdraw.js';
import { cityCanvas } from './minimap.js';
import { sunnyCanvas } from './mapsunny.js';
import { WORLD_BOUNDS } from '../world/heightfield.js';
import { DISTRICT_LIST, districtAt } from '../world/districts.js';
import { CITY_NAME } from '../palette.js';

export const MAP_KEY = 'KeyN';
const CLOSE_KEYS = [MAP_KEY, 'Escape', 'Backspace'];
const PAN_SPEED = 620;
const ZOOM_STEP = 1.3;

const LEGEND = [
  ['pin', '#ffc94a', 'Story job'],
  ['pin', '#ffd84a', 'Activity'],
  ['ring', '#ffc94a', 'Job target'],
  ['shop', '#ff5a4f', 'Shop (letter: G guns, C clothes, D cars, S spray, F food, H flat, L lock-up)'],
  ['dot', '#ffe27a', 'Landmark'],
  ['police', '#3b6bff', 'Police car'],
  ['air', '#ffd166', 'Police helicopter'],
  ['you', '#c45cff', 'You'],
];

/** Only a game with packages out in it lists them; a staged scene has none. */
const PACKAGE_KEY = '<li><i class="map-key-dot" style="--c:#ffc94a;transform:scale(0.65);border-color:#1a0f28"></i>'
  + 'Hidden package</li>';

function legendHtml(packages) {
  const marks = LEGEND.map(([kind, colour, text]) =>
    `<li><i class="map-key-${kind}" style="--c:${colour}"></i>${text}</li>`).join('') + (packages ? PACKAGE_KEY : '');
  const areas = DISTRICT_LIST.map((d) => `<li><i class="map-key-area" style="--c:${d.accent}"></i>${d.name}</li>`)
    .join('');
  return `<h3>Legend</h3><ul>${marks}</ul><h3>Districts</h3><ul>${areas}</ul>`;
}

/** The map overlay; open(), close(), update(input, dt) (returns 'close' when shut) and draw() each frame. */
export function createMapScreen(game) {
  const root = document.createElement('div');
  root.id = 'map-screen';
  root.innerHTML = `<header><span class="map-kicker">Map</span><h2>${CITY_NAME}</h2><p class="map-where"></p></header>
    <canvas></canvas><aside class="map-legend">${legendHtml(game.packages.active)}</aside>
    <footer><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> pan &nbsp; <kbd>+</kbd><kbd>−</kbd> or wheel zoom
    &nbsp; <kbd>Space</kbd> find me &nbsp; <kbd>N</kbd> close</footer>`;
  document.body.appendChild(root);
  const canvas = root.querySelector('canvas');
  const where = root.querySelector('.map-where');
  const ctx = canvas.getContext('2d');
  const projection = createProjection(WORLD_BOUNDS, 960, 600);
  const base = sunnyCanvas(cityCanvas(game.city.layout));
  const state = { open: false, drag: null, summary: '' };
  const emit = (kind) => game.action.events.emit('ui', { kind });

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(240, Math.round(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      projection.resize(w, h);
    }
  }

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    projection.zoomBy(factor, event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });
  canvas.addEventListener('mousedown', (event) => {
    state.drag = { x: event.clientX, y: event.clientY };
  });
  window.addEventListener('mouseup', () => {
    state.drag = null;
  });
  window.addEventListener('mousemove', (event) => {
    if (!state.open || !state.drag) return;
    projection.pan(state.drag.x - event.clientX, state.drag.y - event.clientY);
    state.drag.x = event.clientX;
    state.drag.y = event.clientY;
  });

  function summary(view) {
    const district = districtAt(view.x, view.z)?.name ?? 'Gull Key and the coast';
    const jobs = view.blips.filter((blip) => blip.mission && !blip.target).length;
    const police = view.blips.filter((blip) => blip.police).length;
    const text = `${district} &middot; ${jobs} job${jobs === 1 ? '' : 's'} on the map`
      + (police ? ` &middot; <b>${police} police unit${police === 1 ? '' : 's'} out</b>` : '');
    if (text !== state.summary) where.innerHTML = state.summary = text;
  }

  return {
    root,
    projection,
    get isOpen() {
      return state.open;
    },
    open({ zoom = 1, centre = false } = {}) {
      state.open = true;
      root.classList.add('open');
      fit();
      projection.reset();
      if (zoom !== 1) projection.zoomBy(zoom);
      if (centre) {
        const view = game.mapView();
        projection.centreOn(view.x, view.z);
      }
      emit('open');
    },
    close() {
      state.open = false;
      state.drag = null;
      root.classList.remove('open');
      emit('close');
    },
    update(input, dt) {
      if (CLOSE_KEYS.some((code) => input.pressed(code))) {
        this.close();
        return 'close';
      }
      const dx = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      const dy = input.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
      if (dx || dy) projection.pan(dx * PAN_SPEED * dt, dy * PAN_SPEED * dt);
      if (['Equal', 'NumpadAdd', 'WheelUp'].some((code) => input.pressed(code))) projection.zoomBy(ZOOM_STEP);
      if (['Minus', 'NumpadSubtract', 'WheelDown'].some((code) => input.pressed(code))) {
        projection.zoomBy(1 / ZOOM_STEP);
      }
      if (input.pressed('Space')) {
        const view = game.mapView();
        if (projection.view.zoom < 2) projection.zoomBy(2.4 / projection.view.zoom);
        projection.centreOn(view.x, view.z);
      }
      return 'open';
    },
    draw() {
      if (!state.open) return;
      fit();
      const view = game.mapView();
      summary(view);
      paintMap(ctx, projection, base, view, game.time);
    },
  };
}
