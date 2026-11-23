// HUD: cash, health, speedometer, minimap with district name, mission panel, radio line and context hints.
import { createMinimap } from './minimap.js';
import { createMissionPanel } from './missionpanel.js';
import { districtAt, PARK } from '../world/districts.js';
import { BEACH_ROAD_X } from '../world/heightfield.js';
import { createRankBar } from './rankbar.js';
import { createWantedStars } from './wantedstars.js';
import { createWeaponPanel } from './weaponpanel.js';
import { createMessages } from './messages.js';
import { createWeaponBar } from './weaponbar.js';
import { createPolicePanel } from './policepanel.js';
import { carLine } from './carline.js';
import { createPlaceFlash } from './placeflash.js';

function element(parent, className, tag = 'div') {
  const node = document.createElement(tag);
  node.className = className;
  parent.appendChild(node);
  return node;
}

function drawSpeedo(ctx, size, kmh) {
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;
  const start = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const fraction = Math.min(1, kmh / 240);
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = 'rgba(30, 14, 46, 0.65)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, start + sweep);
  ctx.stroke();
  const gradient = ctx.createLinearGradient(0, size, size, 0);
  gradient.addColorStop(0, '#3fe0d0');
  gradient.addColorStop(0.6, '#c45cff');
  gradient.addColorStop(1, '#ff4fa0');
  ctx.strokeStyle = gradient;
  ctx.shadowColor = '#ff4fa0';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, start + sweep * Math.max(0.005, fraction));
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  for (let tick = 0; tick <= 12; tick += 1) {
    const angle = start + (sweep * tick) / 12;
    const inner = radius - size * (tick % 3 === 0 ? 0.1 : 0.06);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * (radius - size * 0.035), cy + Math.sin(angle) * (radius - size * 0.035));
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(20,6,30,0.9)';
  ctx.shadowBlur = 8;
  ctx.font = `800 ${Math.round(size * 0.26)}px "Avenir Next", Futura, Arial, sans-serif`;
  ctx.fillText(String(Math.round(kmh)), cx, cy - size * 0.02);
  ctx.font = `700 ${Math.round(size * 0.075)}px "Avenir Next", Futura, Arial, sans-serif`;
  ctx.fillText('KM/H', cx, cy + size * 0.17);
  ctx.shadowBlur = 0;
}

function placeName(x, z) {
  const district = districtAt(x, z);
  if (district) return district.name;
  const park = PARK.rect;
  if (x >= park.x0 && x <= park.x1 && z >= park.z0 && z <= park.z1) return PARK.name;
  // East of the district box: the seaside lane of Shoreline Parade and the sand are the beach, the island beyond.
  if (x > 480) return 'Gull Key';
  if (x >= BEACH_ROAD_X) return 'Palmetto Beach';
  return 'Port Meridian';
}

/** The tag the radio line shows before each kind of segment (songs go untagged). */
const RADIO_TAG = { dj: 'On air', ad: 'Ad', news: 'News' };

/** Build the HUD over the canvas; update(view) refreshes it from a plain view object. */
export function createHud(layout, visible = true) {
  const root = document.createElement('div');
  root.id = 'hud';
  if (!visible) root.classList.add('hidden');
  document.body.appendChild(root);
  const status = element(root, 'status');
  const cash = element(status, 'cash');
  const healthBar = element(element(status, 'health'), '');
  const armourBar = element(element(status, 'armour'), '');
  const rankBar = createRankBar(status);
  const wanted = createWantedStars(status);
  const weapon = createWeaponPanel(status);
  const weaponBar = createWeaponBar(status);
  const left = element(root, 'leftcol');
  const missionPanel = createMissionPanel(left);
  const messages = createMessages(root, left);
  const policePanel = createPolicePanel(left);
  let policeTimer = 0;
  const radio = element(root, 'radio');
  let lastRadio = null;
  const district = element(root, 'district');
  const flashes = createPlaceFlash(root);
  const minimapBox = element(root, 'minimap');
  const minimap = createMinimap(minimapBox, layout);
  const speedoBox = element(root, 'speedo');
  const speedo = document.createElement('canvas');
  speedo.width = 380;
  speedo.height = 380;
  speedoBox.appendChild(speedo);
  const speedoCtx = speedo.getContext('2d');
  const carBox = element(speedoBox, 'car-line');
  const carName = element(carBox, 'car-name', 'span');
  const carStanding = element(carBox, 'car-standing', 'span');
  let lastCar = '';
  const hint = element(root, 'hint');
  let lastHint = null;

  return {
    root,
    messages,
    say: (html, seconds, kind) => messages.say(html, seconds, kind),
    /** Flash the district Ilo stands in on the next frame, as on entering it. */
    announcePlace: () => flashes.announce(),
    update(view) {
      root.classList.toggle('menu', Boolean(view.menu));
      root.classList.toggle('on-foot', !view.driving);
      cash.textContent = `$${view.cash.toLocaleString('en-US')}`;
      healthBar.style.width = `${Math.max(0, Math.min(100, view.health))}%`;
      armourBar.style.width = `${Math.max(0, Math.min(100, view.armour ?? 0))}%`;
      armourBar.parentElement.style.display = view.armour > 0 ? 'block' : 'none';
      rankBar.update(view.respect ?? 0);
      const starMode = view.starState ?? (view.stars > 0 ? (view.searching ? 'searching' : 'seen') : 'none');
      wanted.update(view.stars ?? 0, starMode);
      // While a unit has the player in sight the minimap's rim flashes red and blue.
      minimapBox.classList.toggle('seen', starMode === 'seen');
      if (view.weapon) weapon.update(view.weapon);
      weapon.root.style.display = view.driving ? 'none' : 'flex';
      if (view.arsenal) weaponBar.update(view.arsenal);
      // In a car the bar stays up, dimmed, as the loadout Ilo will have on stepping out.
      weaponBar.root.classList.toggle('stowed', Boolean(view.driving));
      policeTimer -= view.dt ?? 1 / 60;
      if (view.police && (policeTimer <= 0 || !view.stars)) {
        policePanel.update(view.stars ? view.police() : null, view.stars ?? 0, Boolean(view.searching));
        policeTimer = 0.25;
      }
      messages.update(view.dt ?? 1 / 60);
      missionPanel.update(view.mission ?? null);
      const card = view.mission ? null : view.objective;
      messages.setObjective(card?.label ?? '', card?.text ?? '');
      const line = view.radio;
      const radioKey = view.driving ? `${line.station}|${line.kind}|${line.text}` : '';
      if (radioKey !== lastRadio) {
        lastRadio = radioKey;
        radio.className = `radio ${line.kind ?? 'song'}`;
        radio.innerHTML = `&#9835; <b>${line.station}</b><i>${RADIO_TAG[line.kind] ?? ''}</i>${line.text}`;
        radio.style.display = view.driving ? '' : 'none';
      }
      const place = placeName(view.x, view.z);
      district.textContent = place;
      minimap.update(view.x, view.z, view.heading, view.blips, view.route, view.search);
      speedoBox.style.display = view.driving ? 'block' : 'none';
      if (view.driving) drawSpeedo(speedoCtx, speedo.width, Math.abs(view.speed) * 3.6);
      const driven = carLine(view.car);
      // Menus and the map hide the flashes; their timers keep running.
      flashes.update(place, view.driving ? driven?.name ?? '' : '', view.dt ?? 1 / 60);
      const carKey = driven ? `${driven.name}|${driven.standing}` : '';
      if (carKey !== lastCar) {
        lastCar = carKey;
        carName.textContent = driven?.name ?? '';
        carStanding.textContent = driven?.standing ?? '';
        carStanding.dataset.standing = driven?.standing.toLowerCase().replaceAll(' ', '-') ?? '';
      }
      if (view.hint !== lastHint) {
        hint.innerHTML = view.hint ?? '';
        lastHint = view.hint;
      }
    },
  };
}
