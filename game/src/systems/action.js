// Action layer assembly: events, gunplay, effects, held props, police and crowd reactions, stepped together.
import { createEvents } from '../core/events.js';
import { createEffects } from '../combat/effects.js';
import { createDecals } from '../combat/decals.js';
import { createGunplay } from '../combat/gunplay.js';
import { createCover } from '../combat/cover.js';
import { applyDamage } from '../combat/vitals.js';
import { createHeldProps } from '../actors/heldprops.js';
import { createReactions } from '../actors/reactions.js';
import { createPolice } from '../police/police.js';
import { createRandom } from '../core/random.js';

/** Build the action layer on top of a game from createGame (before its first step). */
export function createAction(game) {
  const { scene, city, fleet, ground, colliders, characters, ilo, player, camera, footCamera, timeOfDay, seed } = game;
  const events = createEvents();
  const effects = createEffects();
  const decals = createDecals();
  const held = createHeldProps(24, city.surfaces.data);
  scene.add(effects.group, decals.mesh, held.group);
  const police = createPolice({ fleet, layout: city.layout, ground, colliders, characters, effects, events, timeOfDay,
    seed, focus: ilo.position, noise: city.surfaces.data });
  scene.add(police.group);
  const cover = createCover(city.props.placements, fleet.cars);
  const gunplay = createGunplay({ ilo, player, camera, footCamera, characters, fleet, colliders, ground, effects,
    decals, events, seed });
  const reactions = createReactions(game.pedestrians, { colliders, ground, events, random: createRandom(seed * 17 + 5),
    ilo, player });

  player.hurtBy = (damage) => {
    if (!player.state.down) {
      applyDamage(player.state.vitals, damage);
      events.emit('player-hit', { damage, x: ilo.position.x, z: ilo.position.z });
    }
  };
  game.playerHooks.onTakeCar = (car) => {
    if (car.owned) return;
    const crime = police.reportCrime('stealCar', car.position.x, car.position.z);
    events.emit('car-taken', { car, seen: crime });
  };

  function movers() {
    const list = [];
    const p = player.state;
    if (p.mode === 'driving' && p.vehicle) {
      list.push({ x: p.vehicle.x, z: p.vehicle.z, vx: p.vehicle.vx, vz: p.vehicle.vz, player: true });
    }
    for (const unit of police.units.units) {
      list.push({ x: unit.vehicle.x, z: unit.vehicle.z, vx: unit.vehicle.vx, vz: unit.vehicle.vz, player: false });
    }
    return list;
  }

  return {
    events,
    effects,
    decals,
    police,
    gunplay,
    reactions,
    cover,
    update(dt, input, time) {
      gunplay.update(dt, input, time);
      const p = player.state;
      p.inCover = p.crouch && p.mode === 'foot' && Boolean(cover.near(ilo.position.x, ilo.position.z));
      police.update(dt, { player, ilo, time });
      reactions.traffic(movers());
      reactions.update(dt);
      effects.update(dt);
    },
    draw(time) {
      held.update(characters.characters);
      decals.update(time);
      police.draw(time);
    },
  };
}
