// Deterministic screenshot scenes behind ?shot=<name>&seed=N: each sets time of day, actors and camera.
import { ACTION_SHOTS } from './shotsaction.js';
import { SHOP_SHOTS } from './shotsshop.js';
import { STORY_MISSIONS } from './missions/story/index.js';

const CLUTTER = ['bin', 'news', 'hydrant', 'bench', 'meter', 'bollard', 'shelter', 'planter', 'palm', 'palmTall',
  'tree', 'lamp', 'sign', 'signal'];

/** The drive: northbound on the x = 100 avenue of Neon Mile, the Marlin Crown casino rising ahead right. */
const DRIVE = { laneX: 102, endZ: -54, heading: Math.PI, speed: 24 };

function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clearOfProps(game, x, z, radius) {
  const lists = game.city.props.placements;
  for (const type of CLUTTER) {
    for (const p of lists[type]) if (Math.hypot(p.x - x, p.z - z) < radius) return false;
  }
  return true;
}

/** A neon sign in `district` near (x, z) with clear pavement in front of it for a character and a camera. */
function findSignSpot(game, x, z, district) {
  const signs = game.city.buildings.signs
    .filter((sign) => sign.kind === 'flat' && sign.district === district)
    .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  for (const sign of signs) {
    const nx = Math.sin(sign.rot);
    const nz = Math.cos(sign.rot);
    const px = sign.x + nx * 2.3;
    const pz = sign.z + nz * 2.3;
    const cx = px + nx * 3.4 + nz * 1.7;
    const cz = pz + nz * 3.4 - nx * 1.7;
    const midX = (px + cx) / 2;
    const midZ = (pz + cz) / 2;
    if (clearOfProps(game, px, pz, 2.4) && clearOfProps(game, midX, midZ, 1.4) && clearOfProps(game, cx, cz, 1.2)) {
      return { sign, nx, nz, px, pz, cx, cz };
    }
  }
  return null;
}

/** Keep a scripted car on its lane along the x axis heading north (or any fixed heading). */
function laneKeeper(game, laneX, heading, throttle) {
  return () => {
    const v = game.player.state.vehicle;
    const sideError = (v.x - laneX) * Math.sign(Math.cos(heading)) * -1;
    const target = heading + Math.max(-0.3, Math.min(0.3, sideError * 0.08));
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
    steps: 40,
    focus: [100, 0, DRIVE.endZ - 25],
    stage(game) {
      const car = game.fleet.add('coupe', '#f0a800');
      const startZ = DRIVE.endZ + DRIVE.speed * (40 / 60);
      car.position.set(DRIVE.laneX, 0, startZ);
      car.heading = DRIVE.heading;
      game.player.enterNow(car);
      game.player.state.vehicle.vz = -DRIVE.speed;
      game.player.state.autopilot = laneKeeper(game, DRIVE.laneX, DRIVE.heading, 0.55);
      game.chaseOptions = { yawOffset: -0.32, distance: 5.0, height: 1.5, look: 1.25 };
      const ahead = [[-14, 6], [-30, 2], [-52, 6], [-76, 2]];
      const oncoming = [[-6, 2], [-24, 6], [-44, 2], [-68, 6]];
      let slot = 0;
      for (const [dz, lane] of ahead) {
        game.traffic.placeNear(slot, 100, DRIVE.endZ + dz + 10, 0, -1, lane);
        slot += 1;
      }
      for (const [dz, lane] of oncoming) {
        game.traffic.placeNear(slot, 100, DRIVE.endZ + dz - 10, 0, 1, lane);
        slot += 1;
      }
      for (const parked of game.fleet.cars) {
        if (!parked.parked) continue;
        const dz = parked.position.z - DRIVE.endZ;
        if (Math.abs(parked.position.x - 100) < 12 && dz > -26 && dz < 20) parked.visible = false;
      }
      return {};
    },
  },
  foot: {
    time: 'night',
    steps: 90,
    focus: [-60, 0, 20],
    stage(game) {
      const spot = findSignSpot(game, -60, 20, 'neon');
      const y = game.ground.surfaceAt(spot.px, spot.pz).height;
      game.ilo.position.set(spot.px, y, spot.pz);
      game.ilo.heading = Math.atan2(spot.cx - spot.px, spot.cz - spot.pz) - 0.35;
      game.cameraMode = 'manual';
      game.camera.position.set(spot.cx, y + 1.45, spot.cz);
      game.camera.lookAt(spot.px - spot.nz * 2.4 + spot.nx * 0.9, y + 1.75, spot.pz + spot.nx * 2.4 + spot.nz * 0.9);
      return {};
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
  aerial: {
    time: 'dusk',
    steps: 10,
    hud: false,
    focus: [-200, 0, 200],
    stage(game) {
      game.cameraMode = 'manual';
      game.camera.position.set(-120, 150, 560);
      game.camera.lookAt(-260, 0, 120);
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
};

/**
 * The full map (N): three jobs done so the next story jobs and both activities pin the map, Ilo on foot by the
 * cab rank with two stars and two cruisers closing in, the whole city at zoom 1.
 */
const MAP_SHOT = {
  time: 'dusk',
  steps: 20,
  focus: [40, 0, 90],
  stage(game) {
    const { police } = game.action;
    game.missions.progress.done.push(...STORY_MISSIONS.slice(0, 3).map((def) => def.id));
    game.player.placeOnFoot(44, 92, Math.PI * 0.75);
    police.setStars(2);
    for (const [x, z] of [[102, 40], [-20, 150]]) police.units.adopt(game.fleet.reuse('cruiser', '#16203a'), x, z, 0);
    return {
      afterStep(index) {
        if (index !== MAP_SHOT.steps - 1) return;
        game.map.open({ zoom: 1.55 });
        game.map.projection.centreOn(12, 10);
      },
    };
  },
};

export function getShot(name) {
  if (name === 'map') return MAP_SHOT;
  return SHOTS[name] ?? ACTION_SHOTS[name] ?? SHOP_SHOTS[name] ?? null;
}
