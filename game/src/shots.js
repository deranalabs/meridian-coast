// Deterministic screenshot scenes behind ?shot=<name>&seed=N: each sets time of day, actors and camera.

const DRIVE_LANE_Z = -62;
const DRIVE_END_X = 40;

function nearestSign(game, x, z, district) {
  let best = null;
  let bestDistance = Infinity;
  for (const sign of game.city.buildings.signs) {
    if (sign.kind !== 'flat' || sign.district !== district) continue;
    const d = Math.hypot(sign.x - x, sign.z - z);
    if (d < bestDistance) {
      bestDistance = d;
      best = sign;
    }
  }
  return best;
}

function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Keep a scripted car on a westbound lane at z = laneZ. */
function laneKeeper(game, laneZ, throttle) {
  return () => {
    const v = game.player.state.vehicle;
    const target = -Math.PI / 2 - Math.max(-0.3, Math.min(0.3, (v.z - laneZ) * 0.08));
    const steer = Math.max(-1, Math.min(1, wrap(target - v.heading) * 2.5));
    return { throttle, steer, handbrake: false };
  };
}

/**
 * Each scene names its time of day, where ambient life spawns (focus) and a stage(game) function that places
 * actors and the camera; `steps` fixed simulation steps then run before the frame is captured.
 */
export const SHOTS = {
  drive: {
    time: 'dusk',
    steps: 36,
    focus: [DRIVE_END_X - 20, 0, DRIVE_LANE_Z],
    stage(game) {
      const car = game.fleet.add('coupe', '#f0a800');
      car.position.set(DRIVE_END_X + 14, 0, DRIVE_LANE_Z);
      car.heading = -Math.PI / 2;
      game.player.enterNow(car);
      const v = game.player.state.vehicle;
      v.vx = -24;
      const ahead = [[-16, 6], [-34, 2], [-58, 6], [-80, 2]];
      const oncoming = [[-8, 2], [-30, 6], [-52, 2], [-74, 6]];
      let slot = 0;
      for (const [dx, lane] of ahead) {
        game.traffic.placeNear(slot, DRIVE_END_X + dx, -60, -1, 0, lane);
        slot += 1;
      }
      for (const [dx, lane] of oncoming) {
        game.traffic.placeNear(slot, DRIVE_END_X + dx, -60, 1, 0, lane);
        slot += 1;
      }
      game.player.state.autopilot = laneKeeper(game, DRIVE_LANE_Z, 0.55);
      for (const parked of game.fleet.cars) {
        if (!parked.parked) continue;
        const dx = parked.position.x - DRIVE_END_X;
        const near = parked.position.z > -60 ? dx > -40 && dx < 30 : dx > -16 && dx < 30;
        if (near) parked.visible = false;
      }
      return {};
    },
  },
  foot: {
    time: 'night',
    steps: 90,
    focus: [-60, 0, 20],
    stage(game) {
      const sign = nearestSign(game, -60, 20, 'neon');
      const nx = Math.sin(sign.rot);
      const nz = Math.cos(sign.rot);
      const x = sign.x + nx * 2.4;
      const z = sign.z + nz * 2.4;
      const y = game.ground.surfaceAt(x, z).height;
      game.ilo.position.set(x, y, z);
      const alongX = nz;
      const alongZ = -nx;
      game.ilo.heading = Math.atan2(nx * 0.6 - alongX, nz * 0.6 - alongZ);
      game.cameraMode = 'manual';
      game.camera.position.set(x + nx * 2.6 - alongX * 4.2, y + 1.55, z + nz * 2.6 - alongZ * 4.2);
      game.camera.lookAt(x + alongX * 7 - nx * 0.6, y + 2.3, z + alongZ * 7 - nz * 0.6);
      return {};
    },
  },
  cast: {
    time: 'dusk',
    steps: 30,
    hud: false,
    focus: [0, 0, -330],
    stage(game) {
      game.cameraMode = 'manual';
      const lineup = [game.ilo, ...game.pedestrians.peds.slice(0, 6).map((ped) => ped.character)];
      const clips = ['idle', 'walk', 'run', 'aim', 'flee', 'idle', 'walk'];
      const place = () => {
        lineup.forEach((character, index) => {
          const x = -4.2 + index * 1.4;
          character.position.set(x, game.ground.surfaceAt(x, -330).height, -330);
          character.heading = 0.35;
          character.speed = clips[index] === 'run' || clips[index] === 'flee' ? 5 : 1.4;
          character.play(clips[index]);
        });
      };
      game.pedestrians.enabled = false;
      place();
      game.camera.position.set(0, 1.5, -321.5);
      game.camera.lookAt(0, 1.0, -330);
      return { afterStep: place };
    },
  },
  title: {
    time: 'dusk',
    steps: 60,
    hud: false,
    title: true,
    focus: [330, 0, -60],
    stage(game) {
      game.cameraMode = 'manual';
      game.camera.position.set(452, 4.5, 30);
      game.camera.lookAt(300, 34, -110);
      return {};
    },
  },
};

export function getShot(name) {
  return SHOTS[name] ?? null;
}
