// Action screenshot scenes: the heist's beach-road police chase with the helicopter (the cover) and a firefight.

import { PART } from './palette.js';
import { BEACH_ROAD_X } from './world/heightfield.js';
import { STORY_POINTS, seedStory } from './shotsstory.js';
import { fillShoreline } from './shotslife.js';

const HEIST = 'gilded-tide';
const ESCAPE_STAGE = 3;

const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

function laneKeeper(game, laneX, heading, throttle) {
  return () => {
    const v = game.player.state.vehicle;
    const sideError = (v.x - laneX) * Math.sign(Math.cos(heading)) * -1;
    const target = heading + Math.max(-0.3, Math.min(0.3, sideError * 0.08));
    return { throttle, steer: Math.max(-1, Math.min(1, wrap(target - v.heading) * 2.5)), handbrake: false };
  };
}

function hideParkedNear(game, x, z0, z1, halfWidth) {
  for (const car of game.fleet.cars) {
    if (car === game.player.state.car) continue;
    if (car.parked && Math.abs(car.position.x - x) < halfWidth && car.position.z > z0 && car.position.z < z1) {
      car.visible = false;
    }
  }
}

const CHASE = { laneX: 102, startZ: 30, speed: 21, steps: 110 };
// The cover runs the northbound lane of Shoreline Parade, beside the boardwalk, clear of the causeway junction.
// yaw: the van's slide off the road axis (about 15 degrees); roll: the camera's tilt about its view axis.
const COVER = { laneX: BEACH_ROAD_X + 3, startZ: 30, speed: 21, steps: 110, paint: '#ff6f3c', yaw: 0.26, roll: -0.06 };

/** Scripted input: holds the given keys from step `from` onwards. */
function holding(codes, from) {
  return (index) => ({
    pressed: (code) => index === from && codes.includes(code),
    down: (...list) => index >= from && list.some((code) => codes.includes(code)),
    axis: () => 0,
    mouse: { dx: 0, dy: 0 },
  });
}

const FIGHT = { x: 97, z: -34, steps: 64 };

export const ACTION_SHOTS = {
  combat: {
    // Golden light from the north-east behind the camera: Ilo, the cruiser, both officers and the people running
    // along the pavements all face the sun, so they read in colour at thumbnail size.
    time: 'golden',
    steps: FIGHT.steps,
    focus: [100, 0, -20],
    stage(game) {
      const { police } = game.action;
      const arsenal = game.player.state.arsenal;
      arsenal.owned.smg = { clip: 30, reserve: 90 };
      arsenal.current = 'smg';
      game.player.placeOnFoot(FIGHT.x, FIGHT.z, 0);
      police.setStars(2);
      const cruiser = game.fleet.reuse('cruiser', '#16203a');
      const unit = police.units.adopt(cruiser, 102.5, FIGHT.z + 16, Math.PI - 2.3);
      unit.vehicle.vx = 0;
      unit.vehicle.vz = 0;
      unit.officersOut = true;
      for (const [x, dz, weapon] of [[96, 10.5, 'pistol'], [104, 11.5, 'shotgun']]) {
        const officer = police.officers.deploy(x, FIGHT.z + dz, Math.PI, weapon);
        officer.cooldown = 0.2;
      }
      // Parked cars and passing traffic both leave the block, so nothing stands between the camera and the fight.
      const clearStreet = () => {
        for (const car of game.fleet.cars) {
          const { x, z } = car.position;
          if (!car.police && Math.abs(x - 100) < 14 && z > FIGHT.z - 8 && z < FIGHT.z + 30) car.visible = false;
        }
      };
      clearStreet();
      // Bystanders: three running down the west pavement toward the camera, one on the east pavement, one
      // cowering by the shops, two filming beyond the officers.
      const extras = [
        [92, 17, 'flee', Math.PI + 0.3], [91, 19.5, 'flee', Math.PI + 0.5], [92.5, 15, 'flee', Math.PI + 0.2],
        [108, 16, 'flee', Math.PI - 0.3], [107.5, 6, 'cower', 0], [108.5, 19, 'film', Math.PI],
        [90.5, 20, 'film', Math.PI],
      ];
      extras.forEach(([x, dz, kind, angle], index) => {
        const ped = game.pedestrians.peds[index];
        ped.character.position.set(x, game.ground.surfaceAt(x, FIGHT.z + dz).height, FIGHT.z + dz);
        ped.react = { state: kind, timer: 9, dirX: Math.sin(angle), dirZ: Math.cos(angle), fromX: FIGHT.x,
          fromZ: FIGHT.z + 16 };
        ped.character.held = kind === 'film' ? 'phone' : null;
      });
      game.cameraMode = 'manual';
      const input = holding(['KeyF'], 12);
      return {
        input,
        afterStep(index) {
          if (index === FIGHT.steps - 2) clearStreet();
          if (index !== FIGHT.steps - 1) return;
          const p = game.ilo.position;
          const hand = game.ilo.joints[PART.handR].elements;
          const aim = { x: Math.sin(game.ilo.heading), y: 0.02, z: Math.cos(game.ilo.heading) };
          const tip = { x: hand[12] + aim.x * 0.45, y: hand[13] + 0.05, z: hand[14] + aim.z * 0.45 };
          game.action.effects.muzzle(tip, aim);
          game.camera.position.set(p.x - 1.4, p.y + 1.75, p.z - 3.1);
          game.camera.lookAt(p.x + 0.7, p.y + 1.1, p.z + 12);
          game.camera.fov = 54;
          game.camera.updateProjectionMatrix();
        },
      };
    },
  },

  // The cover: Gilded Tide, stage 4 of 5. Late afternoon on Shoreline Parade: Ilo runs the dragnet north in the
  // linen van (sprayed sunset orange for the job) sliding between the hotels and the beach, a cruiser at each rear
  // quarter, a third behind, Air-1 ahead with its lamp on the road and the low sun over the sea, while Solis calls
  // every unit on the radio.
  mission: {
    time: 'golden',
    steps: COVER.steps,
    focus: [COVER.laneX, 0, COVER.startZ - 30],
    stage(game) {
      const { police } = game.action;
      seedStory(game, STORY_POINTS.lastJob);
      game.missions.jump(HEIST, ESCAPE_STAGE);
      const car = game.missions.state.props.cars['linen-van'].car;
      car.position.set(COVER.laneX, 0, COVER.startZ);
      car.heading = Math.PI;
      game.fleet.setColour(car, COVER.paint);
      game.player.enterNow(car);
      const arsenal = game.player.state.arsenal;
      // Six rounds out of the first clip of the SMG as the gun shop sells it.
      arsenal.owned.smg.clip -= 6;
      arsenal.current = 'smg';
      // Seven jobs in, on the last one: scraped but still in a vest.
      Object.assign(game.player.state.vitals, { health: 72, armour: 58 });
      game.player.state.vehicle.vz = -COVER.speed;
      game.player.state.autopilot = laneKeeper(game, COVER.laneX, Math.PI, 0.62);
      police.setStars(4);
      const chasers = [[COVER.laneX - 0.5, 10], [COVER.laneX - 4.5, 17], [COVER.laneX + 0.5, 26]];
      const units = chasers.map(([x, dz]) => {
        const cruiser = game.fleet.reuse('cruiser', '#16203a');
        const unit = police.units.adopt(cruiser, x, COVER.startZ + dz, Math.PI);
        unit.vehicle.vz = -COVER.speed * 1.05;
        return unit;
      });
      hideParkedNear(game, BEACH_ROAD_X, COVER.startZ - 90, COVER.startZ + 60, 9);
      // About 43 m north of the start is where the van is when the frame is taken.
      fillShoreline(game, COVER.laneX - 0.5, COVER.startZ - 43);
      game.cameraMode = 'manual';
      // One step before the capture the van kicks its tail out (nose toward the sea, still running north) with a
      // cruiser at each rear quarter and the third further back; the autopilot holds the wheel straight.
      const slide = () => {
        const v = game.player.state.vehicle;
        Object.assign(v, { x: COVER.laneX - 0.5, heading: Math.PI - COVER.yaw, vx: 0, vz: -COVER.speed, yawRate: 0 });
        game.player.state.autopilot = () => ({ throttle: 0.62, steer: 0, handbrake: false });
        const spots = [[-3.1, 2.9, 0.06], [3.0, 2.5, -0.07], [-0.4, 15, 0]];
        units.forEach((unit, i) => {
          const [dx, dz, turn] = spots[i];
          Object.assign(unit.vehicle, { x: v.x + dx, z: v.z + dz, heading: Math.PI + turn, vx: 0,
            vz: -COVER.speed, yawRate: 0 });
        });
      };
      return {
        afterStep(index) {
          if (index === 0) {
            const p = game.player.state.vehicle;
            police.helicopter.arrive({ x: p.x, y: 0, z: p.z }, 0);
            Object.assign(police.helicopter.state, { x: p.x + 8, z: p.z + 30, y: 27 });
          }
          if (index === COVER.steps - 2) {
            // Finish Solis's line a step early so the card shows it whole on the captured frame.
            if (!game.dialogue.conversation.complete) game.dialogue.conversation.skip();
            slide();
          }
          if (index !== COVER.steps - 1) return;
          const p = game.player.state.car.position;
          // Air-1 high at top centre, its lamp on the road ahead of the van.
          const spot = { x: p.x + 1.4, y: p.y, z: p.z - 9 };
          Object.assign(police.helicopter.state, { x: p.x + 2, z: p.z - 19, y: p.y + 13.2, heading: 0.6,
            aim: { x: spot.x, z: spot.z } });
          police.helicopter.update(1 / 60, spot, game.time);
          // A chase camera up and behind, pitched about 8 degrees down (horizon near 40 % from the top) and aimed a
          // little right of the van, so it sits left of centre; a slight roll and a wide lens sell the speed.
          const cam = game.camera;
          cam.position.set(p.x + 1, p.y + 5, p.z + 13);
          cam.up.set(0, 1, 0);
          cam.lookAt(p.x + 4.2, p.y - 0.9, p.z - 29);
          cam.rotateZ(COVER.roll);
          cam.fov = 70;
          cam.updateProjectionMatrix();
        },
      };
    },
  },
};
