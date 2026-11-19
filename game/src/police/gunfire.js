// Police gunfire: an officer's shot at the player with a hit chance from range, cover, speed and the car body.
import { applyDamage } from '../combat/vitals.js';
import { PART } from '../palette.js';

const DAMAGE = { pistol: 7, shotgun: 16, smg: 6 };

/** Chance 0..1 that one police shot hits, from distance (m), cover, driving and running. */
export function hitChance(distance, { inCover = false, driving = false, running = false } = {}) {
  let chance = 0.72 - distance * 0.024;
  if (driving) chance -= 0.22;
  if (running) chance -= 0.14;
  if (inCover) chance *= 0.25;
  return Math.max(0.04, Math.min(0.8, chance));
}

/** fire(officer, target, player) shoots once: tracer, flash, maybe damage, and a gunshot event. */
export function createPoliceGunfire({ effects, events, colliders, random }) {
  return {
    fire(officer, target, player) {
      const c = officer.character;
      const e = c.joints[PART.handR].elements;
      const muzzle = { x: e[12] - e[4] * 0.25, y: e[13] - e[5] * 0.25, z: e[14] - e[6] * 0.25 };
      const distance = Math.hypot(target.x - muzzle.x, target.z - muzzle.z);
      const p = player.state;
      const chance = hitChance(distance, { inCover: p.crouch && p.inCover, driving: target.driving,
        running: !target.driving && target.speed > 3 });
      const hit = random() < chance;
      const spread = hit ? 0.25 : 1.2 + random() * 1.6;
      const end = {
        x: target.x + (random() - 0.5) * spread,
        y: target.y + (target.driving ? 0.9 : 1.2) + (random() - 0.5) * spread * 0.6,
        z: target.z + (random() - 0.5) * spread,
      };
      if (!hit) {
        end.x += (end.x - muzzle.x) * 0.25;
        end.z += (end.z - muzzle.z) * 0.25;
        end.y = Math.max(target.y + 0.05, end.y - 0.6);
      }
      const wall = colliders.segmentHit(muzzle.x, muzzle.z, end.x, end.z, 1);
      const blocked = wall < 1;
      if (blocked) {
        end.x = muzzle.x + (end.x - muzzle.x) * wall;
        end.y = muzzle.y + (end.y - muzzle.y) * wall;
        end.z = muzzle.z + (end.z - muzzle.z) * wall;
      }
      const dx = end.x - muzzle.x;
      const dy = end.y - muzzle.y;
      const dz = end.z - muzzle.z;
      const length = Math.hypot(dx, dy, dz) || 1;
      effects.tracer(muzzle, end);
      effects.muzzle(muzzle, { x: dx / length, y: dy / length, z: dz / length });
      const back = { x: -dx / length, y: 0.3, z: -dz / length };
      if (!hit || blocked) effects.impact(end, back, blocked ? 'wall' : 'ground');
      else if (!p.down) {
        const damage = (DAMAGE[officer.weapon] ?? 7) * (target.driving ? 0.5 : 1);
        applyDamage(p.vitals, damage);
        events.emit('player-hit', { damage, x: muzzle.x, z: muzzle.z });
        effects.impact(end, { x: -dx / length, y: 0.2, z: -dz / length }, target.driving ? 'car' : 'body');
      }
      events.emit('gunshot', { x: c.position.x, z: c.position.z, source: 'police', weapon: officer.weapon });
    },
  };
}
