// Busted and wasted: freezes Ilo, shows the banner, takes the cash penalty and respawns at the station or clinic.
import { PENALTIES } from '../data/prices.js';
import { takePenalty } from '../economy/wallet.js';
import { knockDown, stepRagdoll, standUp } from '../actors/ragdoll.js';
import { createScreens } from '../ui/screens.js';

const BANNER = 3.2;
const RESPAWN = 4.2;

/** Watches for 'busted' events and zero health; update(dt) runs the sequence. */
export function createRespawn(game, places, hooks = {}) {
  const screens = createScreens();
  const { player, ilo, ground, colliders } = game;
  const events = game.action.events;
  const state = { kind: null, timer: 0, fine: 0 };

  function begin(kind) {
    if (state.kind) return;
    state.kind = kind;
    state.timer = 0;
    const p = player.state;
    if (p.mode !== 'foot') {
      const at = p.car ? p.car.position : ilo.position;
      const side = p.car ? p.car.spec.width / 2 + 0.6 : 0;
      const heading = p.car ? p.car.heading : 0;
      player.placeOnFoot(at.x + Math.cos(heading) * side, at.z - Math.sin(heading) * side, heading + Math.PI / 2);
    }
    p.down = true;
    p.crouch = false;
    ilo.held = null;
    if (kind === 'wasted') knockDown(ilo, -Math.sin(ilo.heading), -Math.cos(ilo.heading), 2.5);
    else ilo.play('cower');
    state.fine = takePenalty(p.wallet, PENALTIES[kind]);
    const where = kind === 'wasted' ? 'Saint Brine Clinic' : 'Meridian PD Central';
    screens.show(kind, kind === 'wasted' ? 'Wasted' : 'Busted', `Fee <em>-$${state.fine.toLocaleString('en-US')}</em>`,
      `You will wake up at ${where}`);
    events.emit(kind, { fine: state.fine });
  }

  function finish() {
    const p = player.state;
    const place = places.find((entry) => entry.kind === (state.kind === 'wasted' ? 'clinic' : 'station'));
    game.action.police.standDown();
    standUp(ilo);
    p.down = false;
    p.vitals.health = 100;
    p.vitals.armour = 0;
    if (place) player.placeOnFoot(place.x + place.outX * 1.5, place.z + place.outZ * 1.5, place.heading);
    screens.hide();
    hooks.say?.(state.kind === 'wasted' ? 'Patched up. Try to stay in one piece' : 'Released. Keep your head down');
    state.kind = null;
  }

  events.on('busted', () => begin('busted'));

  return {
    state,
    get active() {
      return Boolean(state.kind);
    },
    update(dt) {
      if (!state.kind && player.state.vitals.health <= 0) begin('wasted');
      if (!state.kind) return;
      state.timer += dt;
      if (state.kind === 'wasted') {
        stepRagdoll(ilo, dt, (x, z) => ground.surfaceAt(x, z).height, (x, z, r) => colliders.resolveCircle(x, z, r));
      }
      if (state.timer > BANNER) screens.black();
      if (state.timer > RESPAWN) finish();
    },
  };
}
