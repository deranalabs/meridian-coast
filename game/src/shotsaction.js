// Action screenshot scenes: the heist's beach-road police chase with the helicopter (the cover) and a firefight.

import { PART } from './palette.js';
import { BEACH_ROAD_X } from './world/heightfield.js';
import { STORY_MISSIONS } from './missions/story/index.js';

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
const COVER = { laneX: BEACH_ROAD_X + 3, startZ: 30, speed: 21, steps: 110, paint: '#ff6f3c' };

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
    time: 'dusk',
    steps: FIGHT.steps,
    focus: [100, 0, -50],
    stage(game) {
      const { police } = game.action;
      const arsenal = game.player.state.arsenal;
      arsenal.owned.smg = { clip: 30, reserve: 90 };
      arsenal.current = 'smg';
      game.player.placeOnFoot(FIGHT.x, FIGHT.z, Math.PI);
      police.setStars(2);
      const cruiser = game.fleet.reuse('cruiser', '#16203a');
      const unit = police.units.adopt(cruiser, 102.5, FIGHT.z - 16, 2.3);
      unit.vehicle.vx = 0;
      unit.vehicle.vz = 0;
      unit.officersOut = true;
      for (const [x, dz, weapon] of [[95.5, -10.5, 'pistol'], [104.5, -11.5, 'shotgun']]) {
        const officer = police.officers.deploy(x, FIGHT.z + dz, 0, weapon);
        officer.cooldown = 0.2;
      }
      hideParkedNear(game, 100, FIGHT.z - 30, FIGHT.z + 6, 14);
      const extras = [
        [90.5, -4, 'flee', -0.9], [91.5, -7, 'flee', -1.3], [92.5, -2.5, 'flee', -1.0], [107.5, -6, 'cower', 0],
        [109, -16, 'film', 0], [89.5, -18, 'film', 0], [93, 2, 'flee', -2.6],
      ];
      extras.forEach(([x, dz, kind, angle], index) => {
        const ped = game.pedestrians.peds[index];
        ped.character.position.set(x, game.ground.surfaceAt(x, FIGHT.z + dz).height, FIGHT.z + dz);
        ped.react = { state: kind, timer: 9, dirX: Math.sin(angle), dirZ: Math.cos(angle), fromX: FIGHT.x,
          fromZ: FIGHT.z - 8 };
        ped.character.held = kind === 'film' ? 'phone' : null;
      });
      game.cameraMode = 'manual';
      const input = holding(['KeyF'], 12);
      return {
        input,
        afterStep(index) {
          if (index !== FIGHT.steps - 1) return;
          const p = game.ilo.position;
          const hand = game.ilo.joints[PART.handR].elements;
          const aim = { x: Math.sin(game.ilo.heading), y: 0.02, z: Math.cos(game.ilo.heading) };
          const tip = { x: hand[12] + aim.x * 0.45, y: hand[13] + 0.05, z: hand[14] + aim.z * 0.45 };
          game.action.effects.muzzle(tip, aim);
          game.camera.position.set(p.x + 1.5, p.y + 1.8, p.z + 3.4);
          game.camera.lookAt(p.x - 0.6, p.y + 1.15, p.z - 12);
          game.camera.fov = 56;
          game.camera.updateProjectionMatrix();
        },
      };
    },
  },

  // The cover: Gilded Tide, stage 4 of 5. Late afternoon on Shoreline Parade: Ilo runs the dragnet north in the
  // linen van (sprayed sunset orange for the job) between the hotels and the beach, three cruisers on its tail
  // and Air-1 low overhead with its lamp on the road, while Solis calls every unit on the radio.
  mission: {
    time: 'golden',
    steps: COVER.steps,
    focus: [COVER.laneX, 0, COVER.startZ - 30],
    stage(game) {
      const { police } = game.action;
      game.missions.progress.done.push(...STORY_MISSIONS.map((def) => def.id).filter((id) => id !== HEIST));
      game.missions.jump(HEIST, ESCAPE_STAGE);
      const car = game.missions.state.props.cars['linen-van'].car;
      car.position.set(COVER.laneX, 0, COVER.startZ);
      car.heading = Math.PI;
      game.fleet.setColour(car, COVER.paint);
      game.player.enterNow(car);
      const arsenal = game.player.state.arsenal;
      arsenal.owned.pistol = { clip: 12, reserve: 36 };
      arsenal.owned.smg = { clip: 24, reserve: 96 };
      arsenal.current = 'smg';
      game.player.state.vehicle.vz = -COVER.speed;
      game.player.state.autopilot = laneKeeper(game, COVER.laneX, Math.PI, 0.62);
      police.setStars(4);
      const chasers = [[COVER.laneX - 0.5, 10], [COVER.laneX - 4.5, 17], [COVER.laneX + 0.5, 26]];
      for (const [x, dz] of chasers) {
        const cruiser = game.fleet.reuse('cruiser', '#16203a');
        const unit = police.units.adopt(cruiser, x, COVER.startZ + dz, Math.PI);
        unit.vehicle.vz = -COVER.speed * 1.05;
      }
      hideParkedNear(game, BEACH_ROAD_X, COVER.startZ - 90, COVER.startZ + 60, 9);
      game.cameraMode = 'manual';
      return {
        afterStep(index) {
          if (index === 0) {
            const p = game.player.state.vehicle;
            police.helicopter.arrive({ x: p.x, y: 0, z: p.z }, 0);
            Object.assign(police.helicopter.state, { x: p.x + 8, z: p.z + 30, y: 27 });
          }
          // Finish Solis's line a step early so the card shows it whole on the captured frame.
          if (index === COVER.steps - 2 && !game.dialogue.conversation.complete) game.dialogue.conversation.skip();
          if (index !== COVER.steps - 1) return;
          const p = game.player.state.car.position;
          // Air-1 hangs low over the second cruiser, big against the blue, its lamp pooled on the road behind Ilo.
          Object.assign(police.helicopter.state, { x: p.x - 3, z: p.z + 16, y: p.y + 9.5, heading: 2.6,
            aim: { x: p.x - 0.5, z: p.z + 5 } });
          police.helicopter.update(1 / 60, { x: p.x - 0.5, y: p.y, z: p.z + 5 }, game.time);
          // Low and close at the van's front corner on the beach side: sea and palms left, hotels right.
          game.camera.position.set(p.x + 2.4, p.y + 1.45, p.z - 6.6);
          game.camera.lookAt(p.x - 0.2, p.y + 2.9, p.z + 14);
          game.camera.fov = 64;
          game.camera.updateProjectionMatrix();
        },
      };
    },
  },
};
