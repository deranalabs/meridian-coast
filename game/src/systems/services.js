// Services assembly: shops, cash pickups, busted/wasted respawns, saving, and HUD messages for game events.
import { createShops } from '../shops/shops.js';
import { createRespawn } from './respawn.js';
import { createPickups } from '../economy/pickups.js';
import { saveGame } from '../save/savesystem.js';
import { createRandom } from '../core/random.js';
import { WEAPONS } from '../combat/weapons.js';

const STARS = ['', '&#9733;', '&#9733;&#9733;', '&#9733;&#9733;&#9733;', '&#9733;&#9733;&#9733;&#9733;',
  '&#9733;&#9733;&#9733;&#9733;&#9733;'];

/** Build the services over a game that already has its action layer and HUD. */
export function createServices(game) {
  const say = (html, seconds) => game.hud.say(html, seconds);
  const events = game.action.events;
  const save = () => {
    const ok = saveGame(game);
    events.emit('saved', { ok });
    return ok;
  };
  const shops = createShops(game, { save, say });
  const respawn = createRespawn(game, shops.places, { say });
  const pickups = createPickups(events, createRandom(game.seed * 71 + 3));
  game.scene.add(pickups.mesh);

  events.on('wanted', (e) => {
    if (e.stars > 0 && !e.change) say(`Wanted <em>${STARS[e.stars]}</em>`, 2.5);
    else if (e.change === 'cleared') say('You lost them', 3);
    else if (e.change === 'lost-star') say(`Down to <em>${STARS[e.stars]}</em>`, 2);
  });
  events.on('cash', (e) => say(`<em>+$${e.amount}</em>`, 1.5));
  events.on('saved', (e) => say(e.ok ? 'Game saved' : 'Could not save (storage blocked)', 2.5));
  events.on('weapon', () => say(WEAPONS[game.player.state.arsenal.current].name, 1.2));
  events.on('reload', () => say('Reloading', 1));

  return {
    shops,
    respawn,
    pickups,
    save,
    get blips() {
      return shops.blips;
    },
    /** One step before the player moves; returns a prompt for the HUD hint, if any. */
    update(dt, input) {
      respawn.update(dt);
      const p = game.player.state;
      const at = p.mode === 'driving' && p.car ? p.car.position : game.ilo.position;
      pickups.update(dt, { x: at.x, z: at.z, driving: p.mode === 'driving' }, p.wallet, game.time,
        (x, z) => game.ground.surfaceAt(x, z).height);
      if (respawn.active) return null;
      return shops.update(dt, input);
    },
  };
}
