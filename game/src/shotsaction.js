// Action screenshot scenes: the heist's dusk police chase with the helicopter (the cover) and a street firefight.

import { PART } from './palette.js';
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
    if (car.parked && Math.abs(car.position.x - x) < halfWidth && car.position.z > z0 && car.position.z < z1) {
      car.visible = false;
    }
  }
}

const CHASE = { laneX: 102, startZ: 30, speed: 21, steps: 110 };

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

  // The cover: Gilded Tide, stage 4 of 5. Ilo runs the dragnet up Neon Mile in the linen van at dusk, three
  // cruisers and Air-1 behind, while Solis calls every unit on the radio.
  mission: {
    time: 'dusk',
    steps: CHASE.steps,
    focus: [100, 0, -40],
    stage(game) {
      const { police } = game.action;
      game.missions.progress.done.push(...STORY_MISSIONS.map((def) => def.id).filter((id) => id !== HEIST));
      game.missions.jump(HEIST, ESCAPE_STAGE);
      const car = game.missions.state.props.cars['linen-van'].car;
      car.position.set(CHASE.laneX, 0, CHASE.startZ);
      car.heading = Math.PI;
      game.player.enterNow(car);
      const arsenal = game.player.state.arsenal;
      arsenal.owned.pistol = { clip: 12, reserve: 36 };
      arsenal.owned.smg = { clip: 24, reserve: 96 };
      arsenal.current = 'smg';
      game.player.state.vehicle.vz = -CHASE.speed;
      game.player.state.autopilot = laneKeeper(game, CHASE.laneX, Math.PI, 0.62);
      police.setStars(4);
      const chasers = [[98.5, 13], [103, 24], [99, 37]];
      for (const [x, dz] of chasers) {
        const cruiser = game.fleet.reuse('cruiser', '#16203a');
        const unit = police.units.adopt(cruiser, x, CHASE.startZ + dz, Math.PI);
        unit.vehicle.vz = -CHASE.speed * 1.05;
      }
      hideParkedNear(game, 100, -80, 80, 14);
      game.cameraMode = 'manual';
      return {
        afterStep(index) {
          if (index === 0) {
            const p = game.player.state.vehicle;
            police.helicopter.arrive({ x: p.x, y: 0, z: p.z }, 0);
            Object.assign(police.helicopter.state, { x: p.x + 8, z: p.z + 30, y: 27 });
          }
          // Finish Solis's line a step early so the card shows it whole on the captured frame.
          if (index === CHASE.steps - 2 && !game.dialogue.conversation.complete) game.dialogue.conversation.skip();
          if (index !== CHASE.steps - 1) return;
          const p = game.player.state.car.position;
          Object.assign(police.helicopter.state, { x: p.x + 3, z: p.z + 30, y: p.y + 14, heading: 2.9 });
          police.helicopter.update(1 / 60, { x: p.x, y: p.y, z: p.z }, game.time);
          game.camera.position.set(p.x + 1.6, p.y + 1.35, p.z - 7.5);
          game.camera.lookAt(p.x - 0.4, p.y + 3.6, p.z + 14);
          game.camera.fov = 60;
          game.camera.updateProjectionMatrix();
        },
      };
    },
  },
};
