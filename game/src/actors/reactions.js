// Crowd reactions: people flee gunfire and fast cars in scattering groups, cower, film, call it in, fight or fall.
import { knockDown, stepRagdoll } from './ragdoll.js';
import { createVitals, applyDamage } from '../combat/vitals.js';

const HEAR = 48;
const FLEE_SPEED = 5.2;

/** Choose a reaction to a threat at distance d (metres) for a person with dice roll `roll` 0..1. */
export function chooseReaction(d, roll, tough) {
  if (tough && d < 12) return 'fight';
  if (d < 9 && roll < 0.35) return 'cower';
  if (d > 14 && roll > 0.84) return 'film';
  if (d > 10 && roll > 0.74) return 'call';
  return 'flee';
}

/** Adds reactions to every pedestrian of `crowd`; ctx = {colliders, ground, events, random, ilo, player}. */
export function createReactions(crowd, { colliders, ground, events, random, ilo, player }) {
  const groundAt = (x, z) => ground.surfaceAt(x, z).height;
  const push = (x, z, r) => colliders.resolveCircle(x, z, r);
  const state = { callCooldown: 0 };

  function react(ped, kind, fromX, fromZ, seconds) {
    if (ped.down) return;
    const c = ped.character;
    const angle = Math.atan2(c.position.x - fromX, c.position.z - fromZ) + (random.next() - 0.5) * 1.3;
    ped.react = { state: kind, timer: seconds, dirX: Math.sin(angle), dirZ: Math.cos(angle), fromX, fromZ };
    c.held = kind === 'film' || kind === 'call' ? 'phone' : null;
  }

  for (const ped of crowd.peds) {
    ped.kind = 'pedestrian';
    ped.vitals = createVitals(60 + random.next() * 40);
    ped.tough = random.chance(0.12);
    ped.down = false;
    ped.react = null;
    ped.character.owner = ped;
    ped.hurt = (hit) => {
      if (ped.down) return { killed: false };
      applyDamage(ped.vitals, hit.damage);
      const c = ped.character;
      if (ped.vitals.health <= 0) {
        ped.down = true;
        ped.downTime = 0;
        c.held = null;
        knockDown(c, hit.dirX, hit.dirZ, hit.force ?? (hit.weapon === 'shotgun' ? 6 : 3));
        events.emit('drop', { x: c.position.x, z: c.position.z, kind: 'pedestrian' });
        return { killed: true };
      }
      c.replay('stagger');
      react(ped, ped.tough && hit.weapon === 'fists' ? 'fight' : 'flee', c.position.x - hit.dirX,
        c.position.z - hit.dirZ, 8);
      ped.react.stun = 0.5;
      return { killed: false };
    };
  }

  /** Everyone in earshot of (x, z) reacts; groups scatter in spread directions. */
  function alarm(x, z, radius, crime) {
    for (const ped of crowd.peds) {
      if (ped.down) continue;
      const p = ped.character.position;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d > radius || (ped.react && (ped.react.state !== 'film' || d > 12))) continue;
      const kind = chooseReaction(d, random.next(), ped.tough && crime);
      react(ped, kind, x, z, kind === 'film' ? 10 + random.next() * 6 : kind === 'call' ? 4 : 6 + random.next() * 5);
    }
  }

  events.on('gunshot', (e) => alarm(e.x, e.z, HEAR, e.source === 'player'));
  events.on('hit', (e) => alarm(e.x, e.z, 18, true));
  events.on('punch', (e) => alarm(e.x, e.z, 12, true));

  function stepReaction(ped, dt) {
    const c = ped.character;
    const r = ped.react;
    r.timer -= dt;
    if (r.stun > 0) {
      r.stun -= dt;
      c.speed = 0;
      return;
    }
    let speed = 0;
    let clip = 'idle';
    const toPlayerX = ilo.position.x - c.position.x;
    const toPlayerZ = ilo.position.z - c.position.z;
    if (r.state === 'flee') {
      speed = FLEE_SPEED;
      clip = 'flee';
      c.heading = Math.atan2(r.dirX, r.dirZ);
    } else if (r.state === 'cower') {
      clip = 'cower';
      if (r.timer < 1.5) r.state = 'flee';
    } else if (r.state === 'film' || r.state === 'call') {
      clip = r.state;
      c.heading = Math.atan2(r.fromX - c.position.x, r.fromZ - c.position.z);
      if (r.state === 'call' && r.timer <= 0 && state.callCooldown <= 0) {
        state.callCooldown = 12;
        events.emit('reported', { x: r.fromX, z: r.fromZ });
      }
    } else if (r.state === 'fight') {
      const d = Math.hypot(toPlayerX, toPlayerZ);
      c.heading = Math.atan2(toPlayerX, toPlayerZ);
      if (player.state.mode !== 'foot' || d > 20) r.state = 'flee';
      else if (d > 1.3) {
        speed = 4;
        clip = 'run';
      } else if (r.punch === undefined || r.punch <= 0) {
        c.replay('punch');
        r.punch = 0.9;
        player.hurtBy?.(6, 'fists');
      }
      r.punch = (r.punch ?? 0) - dt;
      if (r.punch > 0.4) clip = null;
    }
    if (speed > 0) {
      const moved = push(c.position.x + Math.sin(c.heading) * speed * dt, c.position.z + Math.cos(c.heading) * speed *
        dt, 0.3);
      if (moved.hit && r.state === 'flee') {
        const turn = Math.atan2(moved.nx, moved.nz);
        r.dirX = Math.sin(turn + 0.6);
        r.dirZ = Math.cos(turn + 0.6);
      }
      c.position.x = moved.x;
      c.position.z = moved.z;
    }
    c.position.y = groundAt(c.position.x, c.position.z);
    c.speed = speed;
    if (clip) c.play(clip);
    if (r.timer <= 0 && r.state !== 'fight') ped.react = null;
    if (r.state === 'fight' && r.timer <= -10) ped.react = null;
    if (!ped.react) {
      c.held = null;
      ped.calm = true;
    }
  }

  /** Cars running people over and drivers who speed at them. movers = [{x, z, vx, vz, player, officer}]. */
  function traffic(movers) {
    for (const ped of crowd.peds) {
      if (ped.down) continue;
      const p = ped.character.position;
      for (const m of movers) {
        const dx = p.x - m.x;
        const dz = p.z - m.z;
        if (Math.abs(dx) > 14 || Math.abs(dz) > 14) continue;
        const speed = Math.hypot(m.vx, m.vz);
        const d = Math.hypot(dx, dz);
        if (d < 1.7 && speed > 3) {
          const hit = { damage: speed * 6, dirX: m.vx / speed, dirZ: m.vz / speed, force: speed * 0.8,
            weapon: 'car' };
          ped.hurt(hit);
          if (!ped.down) {
            knockDown(ped.character, hit.dirX, hit.dirZ, speed * 0.6);
            ped.down = true;
            ped.downTime = 0;
            ped.react = null;
          }
          if (m.player) events.emit('run-over', { x: p.x, z: p.z, speed });
          events.emit('crash', { speed: speed * 0.4, x: p.x, z: p.z, player: m.player, body: true });
          break;
        }
        const ahead = (dx * m.vx + dz * m.vz) / (speed || 1);
        if (speed > 9 && ahead > 0 && ahead < 16 && !ped.react) {
          const side = Math.abs(dx * m.vz - dz * m.vx) / (speed || 1);
          if (side < 3.5) react(ped, 'flee', m.x, m.z, 3);
        }
      }
    }
  }

  return {
    alarm,
    traffic,
    update(dt) {
      state.callCooldown -= dt;
      for (const ped of crowd.peds) {
        if (ped.down) {
          ped.downTime += dt;
          stepRagdoll(ped.character, dt, groundAt, push);
        } else if (ped.react) stepReaction(ped, dt);
      }
    },
  };
}
