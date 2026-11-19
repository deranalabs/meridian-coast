// Player gunplay: weapon switching, reloads, aimed or assisted hip fire, punches, recoil, tracers and impacts.
import * as THREE from '../../vendor/three.module.min.js';
import { WEAPONS, WEAPON_ORDER } from './weapons.js';
import { tryFire, updateArsenal, startReload, select, cycle } from './arsenal.js';
import { castShot } from './hitscan.js';
import { createRandom } from '../core/random.js';
import { PART } from '../palette.js';

const ASSIST_CONE = 0.4;
const BARREL = { pistol: 0.22, smg: 0.36, shotgun: 0.6 };
const handPosition = new THREE.Vector3();
const barrelAxis = new THREE.Vector3();
const cameraForward = new THREE.Vector3();

/** Wire the player's arsenal to input and the world; update(dt, input, time) runs one step on foot. */
export function createGunplay({ ilo, player, camera, footCamera, characters, fleet, colliders, ground, effects,
  decals, events, seed = 1 }) {
  const random = createRandom(seed * 131 + 7);
  const arsenal = player.state.arsenal;
  const world = { characters: characters.characters, cars: fleet.cars, colliders, ignore: ilo,
    groundAt: (x, z) => ground.surfaceAt(x, z).height };
  const state = { bloom: 0, lastShot: -9, kick: 0 };

  function muzzle() {
    const e = ilo.joints[PART.handR].elements;
    handPosition.set(e[12], e[13], e[14]);
    barrelAxis.set(-e[4], -e[5], -e[6]).normalize();
    return handPosition.clone().addScaledVector(barrelAxis, BARREL[arsenal.current] ?? 0.2);
  }

  /** Nearest standing person within the assist cone in front of Ilo, preferring police. */
  function assistTarget(range) {
    const hx = Math.sin(ilo.heading);
    const hz = Math.cos(ilo.heading);
    let best = null;
    let bestScore = Infinity;
    for (const c of characters.characters) {
      if (c === ilo || !c.visible || !c.owner || c.owner.down) continue;
      const dx = c.position.x - ilo.position.x;
      const dz = c.position.z - ilo.position.z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 0.5) continue;
      const angle = Math.acos(Math.max(-1, Math.min(1, (dx * hx + dz * hz) / d)));
      if (angle > ASSIST_CONE) continue;
      const score = d * (1 + angle * 3) * (c.owner.kind === 'officer' ? 0.5 : 1);
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  function hurt(hit, weapon, dir) {
    if (hit.kind === 'body' && hit.target.owner) {
      const result = hit.target.owner.hurt({ damage: weapon.damage, dirX: dir.x, dirZ: dir.z, source: 'player',
        weapon: weapon.id });
      events.emit('hit', { target: hit.target, owner: hit.target.owner, source: 'player', killed: result?.killed,
        x: hit.point.x, z: hit.point.z });
    } else if (hit.kind === 'car') {
      events.emit('car-shot', { car: hit.target, source: 'player', point: hit.point });
    }
  }

  function fireGun(weapon, aiming, time) {
    const origin = muzzle();
    const dir = new THREE.Vector3();
    let castFrom = origin;
    if (aiming) {
      camera.getWorldDirection(cameraForward);
      dir.copy(cameraForward);
      castFrom = camera.position.clone().addScaledVector(dir, 2.5);
    } else {
      const target = assistTarget(weapon.range * 0.6);
      if (target) {
        dir.set(target.position.x - origin.x, target.position.y + 1.25 - origin.y, target.position.z - origin.z);
        ilo.heading = Math.atan2(target.position.x - ilo.position.x, target.position.z - ilo.position.z);
      } else dir.set(Math.sin(ilo.heading), -0.02, Math.cos(ilo.heading));
      dir.normalize();
    }
    player.state.shootTimer = 0.6;
    const spread = weapon.spread * (aiming ? 0.33 : 1) * (1 + state.bloom) * (player.state.crouch ? 0.7 : 1);
    for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
      const d = dir.clone();
      d.x += (random.next() - 0.5) * spread * 2;
      d.y += (random.next() - 0.5) * spread * 1.2;
      d.z += (random.next() - 0.5) * spread * 2;
      d.normalize();
      const hit = castShot(castFrom, d, weapon.range, world);
      effects.tracer(origin, hit.point);
      if (hit.kind !== 'air') {
        effects.impact(hit.point, hit.normal, hit.kind);
        if (hit.kind !== 'body') decals.add(hit.point, hit.normal, time, weapon.id === 'shotgun' ? 0.12 : 0.16);
      }
      hurt(hit, weapon, d);
    }
    effects.muzzle(origin, dir);
    state.bloom = Math.min(2.5, state.bloom + weapon.recoil * 12);
    state.kick += weapon.recoil;
    state.lastShot = time;
    events.emit('gunshot', { x: ilo.position.x, z: ilo.position.z, source: 'player', weapon: weapon.id,
      dirX: dir.x, dirZ: dir.z });
  }

  function punch() {
    ilo.replay('punch');
    player.state.actionTimer = 0.4;
    const hx = Math.sin(ilo.heading);
    const hz = Math.cos(ilo.heading);
    for (const c of characters.characters) {
      if (c === ilo || !c.visible || !c.owner || c.owner.down) continue;
      const dx = c.position.x - ilo.position.x;
      const dz = c.position.z - ilo.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.6 && (dx * hx + dz * hz) / (d || 1) > 0.4) {
        hurt({ kind: 'body', target: c, point: { x: c.position.x, y: c.position.y + 1.4, z: c.position.z } },
          WEAPONS.fists, { x: hx, z: hz });
        events.emit('punch', { x: c.position.x, z: c.position.z });
        return;
      }
    }
    events.emit('swing', { x: ilo.position.x, z: ilo.position.z });
  }

  return {
    state,
    update(dt, input, time) {
      updateArsenal(arsenal, dt);
      state.bloom = Math.max(0, state.bloom - dt * 3);
      const kick = Math.min(state.kick, dt * 0.6 + state.kick * 0.3);
      footCamera.state.pitch = Math.max(-0.35, footCamera.state.pitch - kick);
      state.kick -= kick;
      if (player.state.mode !== 'foot' || player.state.down) return;
      WEAPON_ORDER.forEach((id, index) => {
        if (input.pressed(`Digit${index + 1}`) && select(arsenal, id)) events.emit('weapon', { id });
      });
      if (input.pressed('WheelUp') || input.pressed('Tab')) cycle(arsenal, 1) && events.emit('weapon', {});
      if (input.pressed('WheelDown')) cycle(arsenal, -1) && events.emit('weapon', {});
      if (input.pressed('KeyR') && startReload(arsenal)) events.emit('reload', { id: arsenal.current });
      const weapon = WEAPONS[arsenal.current];
      ilo.held = weapon.melee ? null : weapon.id;
      const trigger = weapon.auto ? input.down('Mouse0', 'KeyF') : input.pressed('Mouse0') || input.pressed('KeyF');
      if (!trigger) return;
      const result = tryFire(arsenal);
      if (result === 'melee') punch();
      else if (result === 'fired') fireGun(weapon, player.state.aiming, time);
      else if (result === 'empty') events.emit('dry-fire', {});
    },
  };
}
