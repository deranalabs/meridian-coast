// Progress page of the pause menu: the large figures, the city map and what comes next, on one screen.
import { progressView, lastSaveText } from './progressdata.js';
import { createProjection } from './mapprojection.js';
import { paintMap } from './mapdraw.js';
import { cityCanvas } from './minimap.js';
import { sunnyCanvas } from './mapsunny.js';
import { WORLD_BOUNDS } from '../world/heightfield.js';

/** At this zoom about this point the four districts fit whole with the coast and Gull Key; open sea is cropped. */
const CITY_VIEW = { zoom: 1.36, x: 66, z: 30 };

const money = (value) => `$${value.toLocaleString('en-US')}`;

function figureHtml({ id, value, of, label, detail }) {
  const long = `${value}${of ?? ''}`.length > 3 ? ' long' : '';
  return `<div class="pg-figure${long}" data-figure="${id}"><b>${value}${of === null ? '' : `<i>/${of}</i>`}</b>
    <span>${label}</span><small>${detail}</small></div>`;
}

function jobHtml(job) {
  if (!job) return '<h3>Story</h3><p class="pg-title">Every job done</p>';
  return `<h3>Next job &middot; ${job.number} of ${job.total}</h3>
    <p class="pg-title">${job.title}<em>from ${job.giver}</em></p>`;
}

function rankHtml(rank) {
  if (!rank) return '<h3>Next rank</h3><p class="pg-line"><b>Top rank</b><em>everything is open</em></p>';
  const opens = rank.opens.length ? `opens ${rank.opens.join(', ')}` : 'opens nothing new';
  return `<h3>Next rank &middot; ${rank.needed} respect to go</h3>
    <p class="pg-line"><b>${rank.name}</b><em>${opens}</em></p>`;
}

function districtsHtml(list) {
  const rows = list.map(({ name, faction, colour }) =>
    `<li style="--c:${colour}"><b>${name}</b><em>${faction}</em></li>`).join('');
  return `<h3>Who holds the city</h3><ul class="pg-turf">${rows}</ul>`;
}

function saleHtml(list) {
  const rows = list.map(({ label, price, needs, short }) => {
    const state = needs ? `Rank: ${needs}` : short ? 'Need cash' : 'Unlocked';
    return `<li class="${needs ? 'locked' : short ? 'short' : 'open'}">
      <b>${label}</b><em>${state}</em><strong>${money(price)}</strong></li>`;
  }).join('');
  return `<h3>On sale now</h3><ul class="pg-sale">${rows}</ul>`;
}

/** The state the figures read, from the live game. */
function stateOf(game) {
  const { wallet, arsenal, vitals } = game.player.state;
  return { progress: game.missions.progress, wallet, arsenal, vitals, outfit: game.outfit, cars: game.ownedCars };
}

/** The panel's map: a pin for each job open now, the next story job on top. Shop tiles would hide the names here. */
function mapBlips(game, next) {
  const pins = game.missions.available().filter((def) => def.startAt).map((def) => ({ id: def.id, x: def.startAt.x,
    z: def.startAt.z, mission: true, colour: def.colour, label: def.title }));
  return pins.sort((one, other) => Number(one.id === next?.id) - Number(other.id === next?.id));
}

/** createProgressPage(parent, game, storedSave) → { show(), hide(), update() }; storedSave() reads the last save. */
export function createProgressPage(parent, game, storedSave) {
  const root = document.createElement('section');
  root.className = 'progress-page';
  root.innerHTML = `<header><h2>Progress</h2><span class="pg-saved"></span>
      <span class="pg-keys"><kbd>Esc</kbd> or <kbd>Enter</kbd> back</span></header>
    <div class="pg-figures"></div>
    <div class="pg-body"><div class="pg-map"><canvas></canvas></div>
      <div class="pg-side"><div class="pg-job"></div><div class="pg-rank"></div><div class="pg-districts"></div>
        <div class="pg-shops"></div></div></div>`;
  parent.appendChild(root);
  const part = (name) => root.querySelector(`.pg-${name}`);
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const projection = createProjection(WORLD_BOUNDS, 576, 500);
  let base = null;
  let map = null;

  function paint() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    projection.resize(canvas.width, canvas.height);
    projection.reset();
    projection.zoomBy(CITY_VIEW.zoom);
    projection.centreOn(CITY_VIEW.x, CITY_VIEW.z);
    base ??= sunnyCanvas(cityCanvas(game.city.layout));
    paintMap(ctx, projection, base, map, game.time);
  }

  return {
    root,
    show() {
      const view = progressView(stateOf(game));
      part('saved').textContent = lastSaveText(storedSave());
      part('figures').innerHTML = view.figures.map(figureHtml).join('');
      part('job').innerHTML = jobHtml(view.job);
      part('rank').innerHTML = rankHtml(view.rank);
      part('districts').innerHTML = districtsHtml(view.districts);
      part('shops').innerHTML = saleHtml(view.sale);
      root.classList.add('open');
      map = { ...game.mapView(), route: null, blips: mapBlips(game, view.job) };
      paint();
    },
    hide() {
      root.classList.remove('open');
    },
    /** Each frame the page is up: repaint the map when the window has changed its size. */
    update() {
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) paint();
    },
  };
}
