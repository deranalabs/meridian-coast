// Ragdoll-lite: a hit body is thrown, slides with friction and topples about its feet onto the ground, limp.

const GRAVITY = 9.8;
const LIE = Math.PI / 2;

/** Throw `character` along (dirX, dirZ) with `strength` m/s; it falls the way it was pushed. */
export function knockDown(character, dirX, dirZ, strength) {
  const facing = dirX * Math.sin(character.heading) + dirZ * Math.cos(character.heading);
  const sign = facing >= 0 ? 1 : -1;
  character.ragdoll = {
    vx: dirX * strength,
    vz: dirZ * strength,
    vy: Math.min(4, strength * 0.3),
    y: 0,
    sign,
    spin: sign * (1.2 + strength * 0.35),
    settled: false,
    time: 0,
  };
  character.speed = 0;
  character.play('limp');
}

/**
 * One step of a falling body. `groundAt(x, z)` gives the floor height; `push(x, z, r)` resolves walls.
 * Returns true once the body lies still.
 */
export function stepRagdoll(character, dt, groundAt, push) {
  const r = character.ragdoll;
  if (!r) return true;
  r.time += dt;
  r.vy -= GRAVITY * dt;
  r.y = Math.max(0, r.y + r.vy * dt);
  if (r.y === 0) {
    r.vy = 0;
    const friction = Math.exp(-5 * dt);
    r.vx *= friction;
    r.vz *= friction;
  }
  let x = character.position.x + r.vx * dt;
  let z = character.position.z + r.vz * dt;
  if (push) {
    const pushed = push(x, z, 0.3);
    if (pushed.hit) {
      r.vx *= -0.3;
      r.vz *= -0.3;
    }
    x = pushed.x;
    z = pushed.z;
  }
  character.position.x = x;
  character.position.z = z;
  character.position.y = groundAt(x, z);
  if (!r.settled) {
    const lean = Math.abs(character.tilt);
    r.spin += r.sign * (3 + 16 * Math.sin(lean)) * dt;
    character.tilt += r.spin * dt;
    if (Math.abs(character.tilt) >= LIE) {
      character.tilt = r.sign * LIE;
      r.spin = -r.spin * 0.28;
      if (Math.abs(r.spin) < 0.5) r.settled = true;
    }
  }
  character.lift = r.y + 0.12 * Math.abs(Math.sin(character.tilt));
  return r.settled && r.y === 0 && Math.hypot(r.vx, r.vz) < 0.2;
}

/** Stand a fallen character back up (recycled pedestrians, respawned officers). */
export function standUp(character) {
  character.ragdoll = null;
  character.tilt = 0;
  character.lift = 0;
  character.play('idle');
}
