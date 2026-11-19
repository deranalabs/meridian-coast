// Officers on foot: a pool of uniformed characters who leave their cruisers, close in, arrest or shoot, and fall.
import { officerAppearance } from './officerlook.js';
import { knockDown, stepRagdoll, standUp } from '../actors/ragdoll.js';
import { createRandom } from '../core/random.js';
import { createVitals, applyDamage } from '../combat/vitals.js';

const RUN = 4.6;
const SHOOT_RANGE = 22;
const HOLD_RANGE = 11;

/**
 * `count` officers made up front (hidden). deploy(x, z, heading) brings one out; update(dt, ctx) runs them.
 * ctx = {target: {x, z, y}, shoot, sees(ax, az, bx, bz), groundAt, push, fire(officer, target)}.
 */
export function createOfficers(characters, count, seed) {
  const random = createRandom(seed * 389 + 3);
  const pool = [];
  for (let index = 0; index < count; index += 1) {
    const character = characters.add(officerAppearance(random), { clip: 'idle', phase: random.next() });
    if (!character) break;
    character.visible = false;
    const officer = {
      kind: 'officer',
      character,
      active: false,
      down: false,
      vitals: createVitals(100),
      cooldown: 0,
      burst: 0,
      downTime: 0,
      stagger: 0,
      strafe: random.chance(0.5) ? 1 : -1,
      hurt(hit) {
        if (officer.down || !officer.active) return { killed: false };
        applyDamage(officer.vitals, hit.damage);
        if (officer.vitals.health <= 0) {
          officer.down = true;
          officer.downTime = 0;
          character.held = null;
          knockDown(character, hit.dirX, hit.dirZ, hit.weapon === 'shotgun' ? 6 : 3.2);
          return { killed: true };
        }
        officer.stagger = 0.45;
        character.replay('stagger');
        return { killed: false };
      },
    };
    character.owner = officer;
    pool.push(officer);
  }

  function deploy(x, z, heading, weapon = 'pistol') {
    const officer = pool.find((o) => !o.active);
    if (!officer) return null;
    const c = officer.character;
    standUp(c);
    officer.active = true;
    officer.down = false;
    officer.vitals.health = 100;
    officer.cooldown = 0.8 + random.next();
    officer.weapon = weapon;
    c.visible = true;
    c.position.set(x, 0, z);
    c.heading = heading;
    c.held = weapon;
    return officer;
  }

  function dismiss(officer) {
    officer.active = false;
    officer.character.visible = false;
    officer.character.held = null;
    standUp(officer.character);
  }

  function updateOne(officer, dt, ctx) {
    const c = officer.character;
    if (officer.down) {
      officer.downTime += dt;
      stepRagdoll(c, dt, ctx.groundAt, ctx.push);
      if (officer.downTime > 25) dismiss(officer);
      return;
    }
    const dx = ctx.target.x - c.position.x;
    const dz = ctx.target.z - c.position.z;
    const distance = Math.hypot(dx, dz);
    const facing = Math.atan2(dx, dz);
    const turn = Math.atan2(Math.sin(facing - c.heading), Math.cos(facing - c.heading));
    c.heading += turn * Math.min(1, dt * 8);
    officer.cooldown -= dt;
    if (officer.stagger > 0) {
      officer.stagger -= dt;
      c.speed = 0;
      return;
    }
    const visible = ctx.sees(c.position.x, c.position.z, ctx.target.x, ctx.target.z);
    const shooting = ctx.shoot && visible && distance < SHOOT_RANGE;
    let speed = 0;
    let sideways = 0;
    if (!ctx.shoot && distance > 1.2) speed = distance > 4 ? RUN : 1.6;
    else if (ctx.shoot && (distance > HOLD_RANGE || !visible)) speed = RUN;
    else if (ctx.shoot) sideways = 1.3 * officer.strafe;
    if (random.chance(dt * 0.3)) officer.strafe *= -1;
    const fx = Math.sin(c.heading);
    const fz = Math.cos(c.heading);
    const pushed = ctx.push(c.position.x + (fx * speed + fz * sideways) * dt, c.position.z + (fz * speed - fx *
      sideways) * dt, 0.35);
    c.position.x = pushed.x;
    c.position.z = pushed.z;
    c.position.y = ctx.groundAt(c.position.x, c.position.z);
    c.speed = speed || Math.abs(sideways);
    c.play(shooting ? 'aim' : speed > 3 ? 'run' : c.speed > 0 ? 'walk' : 'idle');
    if (shooting && officer.cooldown <= 0) {
      ctx.fire(officer, distance);
      officer.burst += 1;
      officer.cooldown = officer.burst % 3 === 0 ? 1.2 + random.next() * 0.8 : 0.28;
    }
  }

  return {
    pool,
    deploy,
    dismiss,
    active: () => pool.filter((o) => o.active),
    /** Officers within `radius` of (x, z) who are standing. */
    near(x, z, radius) {
      return pool.filter((o) => o.active && !o.down && Math.hypot(o.character.position.x - x,
        o.character.position.z - z) < radius);
    },
    update(dt, ctx) {
      for (const officer of pool) {
        if (!officer.active) continue;
        updateOne(officer, dt, ctx);
        const far = Math.hypot(officer.character.position.x - ctx.target.x,
          officer.character.position.z - ctx.target.z);
        if (far > 140 || (ctx.recall && !officer.down && far > 45)) dismiss(officer);
      }
    },
  };
}
