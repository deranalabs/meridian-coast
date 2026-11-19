// Sound facade: wires the mixer, engine, police voices, radio bed and one-shots to the game state and event bus.
import { createMixer } from './mixer.js';
import { createEngine } from './engine.js';
import { createSiren } from './siren.js';
import { createRadioBed } from './radiobed.js';
import { createSfx } from './sfx.js';
import { isSearching } from '../police/wanted.js';

/** createSound(game, events, { volume, muted }) → { mixer, sfx, update(), setPaused(on) }. */
export function createSound(game, events = game.action.events, options = {}) {
  const mixer = createMixer(options);
  const engine = createEngine(mixer);
  const siren = createSiren(mixer);
  const bed = createRadioBed(mixer);
  const sfx = createSfx(mixer);
  const seen = { units: 0, paused: false };
  const ilo = game.ilo.position;
  const away = (e) => (Number.isFinite(e?.x) ? Math.hypot(e.x - ilo.x, e.z - ilo.z) : 0);

  const unlock = () => mixer.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', (event) => {
    mixer.unlock();
    if (event.code === 'KeyM' && !event.repeat && !event.target?.closest?.('input')) mixer.toggleMute();
  });

  events.on('gunshot', (e) => sfx.gunshot(e.weapon, away(e)));
  events.on('hit', () => sfx.impact('body'));
  events.on('car-shot', () => sfx.impact('metal'));
  events.on('punch', () => sfx.impact('punch'));
  events.on('swing', () => sfx.impact('swing'));
  events.on('crash', (e) => {
    if (e.player || away(e) < 40) sfx.impact(e.body ? 'body' : 'crash', (e.speed ?? 8) / 20);
  });
  events.on('dry-fire', () => sfx.ui('dry'));
  events.on('reload', () => sfx.ui('reload'));
  events.on('weapon', () => sfx.ui('select'));
  events.on('cash', () => sfx.cash());
  events.on('respray', () => sfx.spray());
  events.on('saved', (e) => sfx.ui(e.ok === false ? 'deny' : 'buy'));
  events.on('busted', () => sfx.sting());
  events.on('wasted', () => sfx.sting());
  events.on('ui', (e) => {
    if (e.kind === 'open') sfx.bell();
    sfx.ui(e.kind);
    if (e.kind === 'buy') sfx.cash();
  });

  return {
    mixer,
    sfx,
    /** The pause menu ducks everything and stops the car and the radio. */
    setPaused(on) {
      if (on === seen.paused) return;
      seen.paused = on;
      mixer.duck(on ? 0.3 : 1);
      sfx.ui(on ? 'pause' : 'resume');
    },
    update() {
      if (!mixer.ctx) return;
      const state = game.player.state;
      const v = state.vehicle;
      const driving = state.mode === 'driving' && Boolean(v) && !seen.paused;
      const top = state.car?.spec?.maxSpeed ?? 50;
      engine.update(driving, driving ? v.speed / top : 0, state.throttle ?? 0, v?.slip ?? 0);

      const police = game.action.police;
      const wanted = police.wanted;
      const sirenMetres = wanted.stars > 0 && !seen.paused ? police.state.siren : Infinity;
      const heli = police.helicopter.state;
      const heliMetres = heli.active && !seen.paused ? Math.hypot(heli.x - ilo.x, heli.z - ilo.z) : Infinity;
      siren.update(sirenMetres, isSearching(wanted), heliMetres);

      const units = police.units.units.length;
      if (units > seen.units && wanted.stars > 0) {
        const unit = police.units.units[units - 1];
        sfx.chirp(Math.hypot(unit.vehicle.x - ilo.x, unit.vehicle.z - ilo.z));
      }
      seen.units = units;

      bed.update(game.radio.state.station, driving && !game.services.shops.openPlace);
    },
  };
}
