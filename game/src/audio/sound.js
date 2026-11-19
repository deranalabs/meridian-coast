// Sound assembly: unlocks audio on the first key, routes game events to effects and steps engine, siren and radio.
import { createMixer } from './mixer.js';
import { createSfx } from './sfx.js';
import { createEngineSound } from './engine.js';
import { createSirenSound } from './siren.js';
import { createStations } from './stations.js';
import { isSearching } from '../police/wanted.js';

/** Build the sound layer for a game that has its action layer and services; update() once per frame. */
export function createSound(game) {
  const mixer = createMixer(window);
  const sfx = createSfx(mixer);
  const live = { engine: null, siren: null, radio: null };
  const car = { driving: false, speed: 0, throttle: 0, slip: 0 };
  const police = { nearest: null, searching: false, heli: null };
  mixer.onStart(() => {
    live.engine = createEngineSound(mixer);
    live.siren = createSirenSound(mixer);
    live.radio = createStations(mixer);
  });

  const listener = () => {
    const p = game.player.state;
    return p.mode === 'driving' && p.car ? p.car.position : game.ilo.position;
  };
  const away = (x, z) => {
    const at = listener();
    return Math.hypot(x - at.x, z - at.z);
  };
  const events = game.action.events;
  events.on('gunshot', (e) => sfx.gunshot(e.weapon, e.source === 'player' ? 0 : away(e.x, e.z)));
  events.on('hit', () => sfx.impact('body'));
  events.on('car-shot', () => sfx.impact('car'));
  events.on('crash', (e) => sfx.crash(e.speed, away(e.x, e.z)));
  events.on('player-hit', () => sfx.hurt());
  events.on('punch', () => sfx.impact('body'));
  events.on('dry-fire', () => sfx.click());
  events.on('weapon', () => sfx.click());
  events.on('reload', () => sfx.click());
  events.on('ui', (e) => sfx.ui(e.kind));
  events.on('cash', () => sfx.cash());

  return {
    mixer,
    sfx,
    update() {
      if (!live.engine || mixer.ctx.state !== 'running') return;
      const p = game.player.state;
      car.driving = p.mode === 'driving' && Boolean(p.vehicle);
      car.speed = car.driving ? p.vehicle.speed : 0;
      car.throttle = car.driving ? p.throttle ?? 0 : 0;
      car.slip = car.driving ? p.vehicle.slip : 0;
      live.engine.update(car);
      const law = game.action.police;
      const at = listener();
      let nearest = null;
      if (law.wanted.stars > 0) {
        for (const unit of law.units.units) {
          const d = Math.hypot(unit.vehicle.x - at.x, unit.vehicle.z - at.z);
          if (nearest === null || d < nearest) nearest = d;
        }
      }
      police.nearest = nearest;
      police.searching = law.wanted.stars > 0 && isSearching(law.wanted);
      const heli = law.helicopter.state;
      police.heli = heli.active ? Math.hypot(heli.x - at.x, heli.z - at.z) : null;
      live.siren.update(police);
      live.radio.update(game.radio.state.station, car.driving && !game.services.shops.openPlace);
    },
  };
}
