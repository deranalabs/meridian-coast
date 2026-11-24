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
// wreck: the burning cruiser's place from the van's start (slewed in the far lane about 19 m ahead of the van at
// the capture, clear of Air-1's cone), its slew off the road axis and the ram speed in m/s that lit it
// (police/burnrule.js).
const COVER = { laneX: BEACH_ROAD_X + 3, startZ: 30, speed: 21, steps: 110, paint: '#ff6f3c', yaw: 0.26, roll: -0.06,
  wreck: { dx: -8.3, dz: -62, turn: 0.95, ram: 19 } };
// The cover's run-up was staged on this handling. It keeps it, so play's handling never moves the staged frame.
const COVER_STEERING = { maxSteer: 0.6, steerFade: 0.62, steerFollow: 7 };
const COVER_ENGINES = { pickup: { maxSpeed: 44, accel: 9 }, cruiser: { maxSpeed: 52, accel: 12.5 } };

function stageHandling(game) {
  const pin = (car) => {
    if (car && COVER_ENGINES[car.type]) car.spec = { ...car.spec, ...COVER_STEERING, ...COVER_ENGINES[car.type] };
    return car;
  };
  const { fleet, player } = game;
  fleet.cars.forEach(pin);
  // A cruiser dispatched during the run-up gets it before its first step.
  const reuse = fleet.reuse.bind(fleet);
  fleet.reuse = (type, colour) => pin(reuse(type, colour));
  player.state.vehicle.spec = player.state.car.spec;
  for (const unit of game.action.police.units.units) unit.vehicle.spec = unit.car.spec;
}

/** Scripted input: holds the given keys from step `from` onwards. */
function holding(codes, from) {
  return (index) => ({
    pressed: (code) => index === from && codes.includes(code),
    down: (...list) => index >= from && list.some((code) => codes.includes(code)),
    axis: () => 0,
    mouse: { dx: 0, dy: 0 },
  });
}

const HEADLINE_JOB = 'headline';
const DRAGNET_STAGE = 3;
const DRAGNET_STARS = 4;
/** A point on the night fight's street: `side` metres south (screen right), `ahead` metres east of the camera. */
const street = (side, ahead) => ({ x: 31 + ahead, z: 22 + side });
/**
 * The night fight on a cross street of Neon Mile, looking east past the lit shop fronts and their signs: where
 * Ilo stands, the cruiser across the road, each officer's spot and weapon, and the crowd.
 */
const FIGHT = {
  steps: 64,
  aimFrom: 6,
  burst: 4,
  ilo: street(-0.7, 4.1),
  cruiser: { ...street(2.9, 13.4), heading: 0.3 },
  officers: [[street(0.8, 10.6), 'pistol'], [street(3.4, 9.5), 'shotgun']],
  crowd: [
    [street(7.6, 12.5), 'flee'], [street(8.4, 15), 'flee'], [street(7.2, 9.2), 'cower'], [street(7.9, 17.5), 'film'],
    [street(8.6, 19.5), 'film'], [street(-4.6, 15.5), 'flee'], [street(-5.4, 17.5), 'film'],
    [street(-3.4, 20), 'film'], [street(5.2, 21), 'flee'], [street(-1.5, 23), 'flee'],
  ],
  camera: { ...street(0, 0), y: 1.95 },
  look: { ...street(1.3, 18), y: 1.6 },
};

const towards = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

/** The muzzle flash at a character's right hand, along the way they face. */
function flashAtHand(game, character) {
  const hand = character.joints[PART.handR].elements;
  const aim = { x: Math.sin(character.heading), y: 0.02, z: Math.cos(character.heading) };
  game.action.effects.muzzle({ x: hand[12] + aim.x * 0.45, y: hand[13] + 0.05, z: hand[14] + aim.z * 0.45 }, aim);
}

export const ACTION_SHOTS = {
  // Headline, stage 4 of 5, at night: Solis's dragnet has Ilo on Neon Mile. The shop fronts, the street lamps
  // and the cruiser's lamps light the fight; the casino and the towers' windows carry the sky.
  combat: {
    time: 'night',
    steps: FIGHT.steps,
    focus: [FIGHT.cruiser.x, 0, FIGHT.cruiser.z],
    stage(game) {
      const { police } = game.action;
      seedStory(game, STORY_POINTS.headlineFight);
      // He fires into the cruiser between the two officers: a hit would stagger one out of his firing stance.
      game.player.placeOnFoot(FIGHT.ilo.x, FIGHT.ilo.z, towards(FIGHT.ilo, street(2.1, 10.6)));
      game.missions.jump(HEADLINE_JOB, DRAGNET_STAGE);
      const { arsenal, vitals } = game.player.state;
      arsenal.current = 'smg';
      const { x, z, heading } = FIGHT.cruiser;
      const unit = police.units.adopt(game.fleet.reuse('cruiser', '#16203a'), x, z, heading);
      const park = () => Object.assign(unit.vehicle, { x, z, heading, vx: 0, vz: 0, speed: 0, yawRate: 0 });
      park();
      unit.officersOut = true;
      const officers = FIGHT.officers.map(([at, weapon]) => {
        const officer = police.officers.deploy(at.x, at.z, towards(at, FIGHT.ilo), weapon);
        officer.cooldown = 0.2;
        return officer;
      });
      // They hold their marks, as officers with cover by their car would, instead of strafing out of the frame.
      const holdMarks = () => officers.forEach((officer, index) => {
        const [at] = FIGHT.officers[index];
        officer.character.position.set(at.x, game.ground.surfaceAt(at.x, at.z).height, at.z);
        officer.character.heading = towards(at, FIGHT.ilo);
      });
      // Parked cars and passing traffic both leave the block, so nothing stands between the camera and the fight.
      const clearStreet = () => {
        for (const car of game.fleet.cars) {
          const ahead = car.position.x - FIGHT.camera.x;
          const side = car.position.z - FIGHT.camera.z;
          if (car !== unit.car && ahead > -6 && ahead < 28 && Math.abs(side) < 12) car.visible = false;
        }
      };
      clearStreet();
      // Bystanders: runners leaving past the shop fronts, one cowering by a door, four filming under the signs.
      FIGHT.crowd.forEach(([at, kind], index) => {
        const ped = game.pedestrians.peds[index];
        ped.character.position.set(at.x, game.ground.surfaceAt(at.x, at.z).height, at.z);
        const way = kind === 'film' ? towards(at, FIGHT.ilo) : towards(FIGHT.ilo, at);
        ped.react = { state: kind, timer: 9, dirX: Math.sin(way), dirZ: Math.cos(way), fromX: x, fromZ: z };
        ped.character.held = kind === 'film' ? 'phone' : null;
      });
      game.cameraMode = 'manual';
      return {
        // He holds the aim. Held fire would land on an officer (aim assist), and that is a fifth star.
        input: holding(['KeyQ'], FIGHT.aimFrom),
        afterStep(index) {
          if (index === 0) game.footCamera.setYaw(towards(FIGHT.ilo, street(2.1, 10.6)));
          if (index === FIGHT.steps - 2) {
            // A short burst out of the first clip, its last round still in the air.
            arsenal.owned.smg.clip -= FIGHT.burst;
            const { x: fromX, y, z: fromZ } = game.ilo.position;
            game.action.effects.tracer({ x: fromX + 0.3, y: y + 1.42, z: fromZ + 0.15 },
              { x: FIGHT.cruiser.x - 1, y: y + 1.1, z: FIGHT.cruiser.z - 0.8 });
            clearStreet();
            park();
            holdMarks();
            // The stage's own alarm: shots near the police would add the fifth star a moment later.
            police.setStars(DRAGNET_STARS);
            // No call card here: the cover has one, and the street gets the bottom of the frame.
            game.dialogue.clear();
            // The sparks reach the screen on the step after they are struck.
            flashAtHand(game, game.ilo);
            for (const officer of officers) flashAtHand(game, officer.character);
          }
          if (index !== FIGHT.steps - 1) return;
          Object.assign(vitals, { health: 64 });
          const { camera } = game;
          camera.position.set(FIGHT.camera.x, game.ilo.position.y + FIGHT.camera.y, FIGHT.camera.z);
          camera.lookAt(FIGHT.look.x, FIGHT.look.y, FIGHT.look.z);
          camera.fov = 49;
          camera.updateProjectionMatrix();
          // Air-1 low between the towers, its lamp on the road among the officers instead of at the camera's feet.
          const lamp = { ...street(2.6, 14.5), y: 0 };
          Object.assign(police.helicopter.state, { ...street(4.4, 44), y: 15.2, heading: 1.2,
            aim: { x: lamp.x, z: lamp.z } });
          police.helicopter.update(1 / 60, lamp, game.time, undefined, { stars: police.wanted.stars });
        },
      };
    },
  },

  // The cover: Gilded Tide, stage 4 of 5. Night on Shoreline Parade: Ilo runs the dragnet north in the linen van
  // (sprayed sunset orange for the job) sliding between the hotels and the beach, a cruiser at each rear quarter,
  // a third behind, Air-1 ahead with its spotlight cone on the road, a rammed cruiser burning in the far lane,
  // while Solis calls every unit on the radio.
  mission: {
    time: 'night',
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
      // A cruiser that swung across to block the van got rammed aside earlier in the run: it sits slewed in the far
      // lane ahead, its engine burning (police/wrecks.js), as the chase comes up on it. A wreck, not a unit, so the
      // dispatch list and the unit count stay as they are.
      const wreck = game.fleet.reuse('cruiser', '#16203a');
      wreck.police = true;
      wreck.position.set(COVER.laneX + COVER.wreck.dx, 0, COVER.startZ + COVER.wreck.dz);
      wreck.heading = Math.PI - COVER.wreck.turn;
      police.wrecks.ignite(wreck, wreck.position.x + 1, wreck.position.z + 1, COVER.wreck.ram);
      stageHandling(game);
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
          police.helicopter.update(1 / 60, spot, game.time, undefined, { stars: police.wanted.stars });
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
  // The same chase at night in the rain: wet road, neon and window glows, the cruisers' bars on the water. A cover
  // candidate kept beside the sheet, not on it.
  missionRain: {
    time: 'night',
    weather: 'rain',
    steps: COVER.steps,
    focus: [COVER.laneX, 0, COVER.startZ - 30],
    stage(game) {
      return ACTION_SHOTS.mission.stage(game);
    },
  },
};
