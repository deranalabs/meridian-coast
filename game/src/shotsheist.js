// Heist screenshot scene: Gilded Tide at the Aurelio vault door, the lance still glowing, as the police box the lane.
import { PART } from './palette.js';
import { STORY_MISSIONS } from './missions/story/index.js';

const HEIST = 'gilded-tide';
const ESCAPE_STAGE = 3;
const STEPS = 90;
const VAN_PAINT = '#ff6f3c';

/** Holds the given keys from step `from` onwards. */
function holding(codes, from) {
  return (index) => ({
    pressed: (code) => index === from && codes.includes(code),
    down: (...list) => index >= from && list.some((code) => codes.includes(code)),
    axis: () => 0,
    mouse: { dx: 0, dy: 0 },
  });
}

/** Lane frame: u runs out from the vault wall across the road, t runs along the kerb. */
function laneFrame(place) {
  const ux = place.outX;
  const uz = place.outZ;
  const at = (u, t) => ({ x: place.x + ux * u - uz * t, z: place.z + uz * u + ux * t });
  const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  return { at, facing };
}

export const HEIST_SHOTS = {
  // Stage 4 of 5: Ilo steps back from the cut door with the SMG up, the orange van loaded at the kerb, two cruisers
  // slewed across the road with their officers out, and the people on the pavement running from the shooting.
  heist: {
    time: 'golden',
    steps: STEPS,
    focus: [336, 0, -74],
    stage(game) {
      const { police } = game.action;
      game.missions.progress.done.push(...STORY_MISSIONS.map((def) => def.id).filter((id) => id !== HEIST));
      game.missions.jump(HEIST, ESCAPE_STAGE);
      const lane = laneFrame(game.missions.places.get('aurelio-lane'));
      const { at, facing } = lane;
      const van = game.missions.state.props.cars['linen-van'].car;
      const vanSpot = at(4.8, 2.5);
      van.position.set(vanSpot.x, 0, vanSpot.z);
      van.heading = facing(vanSpot, at(4.8, 8));
      game.fleet.setColour(van, VAN_PAINT);
      const arsenal = game.player.state.arsenal;
      arsenal.owned.pistol = { clip: 12, reserve: 36 };
      arsenal.owned.smg = { clip: 30, reserve: 120 };
      arsenal.current = 'smg';
      Object.assign(game.player.state.vitals, { health: 84, armour: 46 });
      game.missions.progress.respect = 172;
      const ilo = at(1.5, -1);
      const threat = at(4.5, -9);
      game.player.placeOnFoot(ilo.x, ilo.z, facing(ilo, threat));
      police.setStars(4);
      for (const [u, t, turn] of [[6, -10, 0.9], [3.5, -13, 0.4]]) {
        const spot = at(u, t);
        const unit = police.units.adopt(game.fleet.reuse('cruiser', '#16203a'), spot.x, spot.z,
          facing(spot, ilo) + turn);
        Object.assign(unit.vehicle, { vx: 0, vz: 0 });
        unit.officersOut = true;
      }
      for (const [u, t, weapon] of [[4, -6, 'pistol'], [2.5, -8.5, 'shotgun']]) {
        const spot = at(u, t);
        police.officers.deploy(spot.x, spot.z, facing(spot, ilo), weapon).cooldown = 0.2;
      }
      // Traffic and parked cars leave the stretch between the camera and the wall; the rest of the street keeps its.
      const keep = new Set([van]);
      const clearLane = () => {
        for (const car of game.fleet.cars) {
          if (keep.has(car) || car.police) continue;
          for (let t = -16; t <= 12; t += 4) {
            const p = at(6, t);
            if (Math.hypot(car.position.x - p.x, car.position.z - p.z) < 8) car.visible = false;
          }
        }
      };
      clearLane();
      // Bystanders: four running up the pavement away from the cruisers, one cowering by the van, two filming.
      const extras = [[0.2, -3, 'flee'], [-0.3, 1.5, 'flee'], [0.6, 4, 'flee'], [1.2, 6.5, 'flee'],
        [3, 5.5, 'cower'], [-0.4, 9, 'film'], [9.5, 3, 'film']];
      const run = facing(at(0, 0), at(0, 10));
      extras.forEach(([u, t, kind], index) => {
        const ped = game.pedestrians.peds[index];
        const spot = at(u, t);
        ped.character.position.set(spot.x, game.ground.surfaceAt(spot.x, spot.z).height, spot.z);
        const angle = kind === 'film' ? facing(spot, ilo) : run;
        ped.react = { state: kind, timer: 9, dirX: Math.sin(angle), dirZ: Math.cos(angle), fromX: threat.x,
          fromZ: threat.z };
        ped.character.held = kind === 'film' ? 'phone' : null;
      });
      game.cameraMode = 'manual';
      return {
        input: holding(['KeyF'], 40),
        afterStep(index) {
          if (index === STEPS - 2) {
            clearLane();
            // The cover already carries a call card; here the street gets the bottom of the frame.
            game.dialogue.clear();
          }
          if (index !== STEPS - 1) return;
          const hand = game.ilo.joints[PART.handR].elements;
          const aim = { x: Math.sin(game.ilo.heading), y: 0.02, z: Math.cos(game.ilo.heading) };
          game.action.effects.muzzle({ x: hand[12] + aim.x * 0.45, y: hand[13] + 0.05, z: hand[14] + aim.z * 0.45 },
            aim);
          // Across the road, looking back at the wall: door and Ilo left of centre, the cruisers to the right.
          const eye = at(14, -3.5);
          const look = at(0, -4.5);
          game.camera.position.set(eye.x, 2.7, eye.z);
          game.camera.lookAt(look.x, 2.1, look.z);
          game.camera.fov = 50;
          game.camera.updateProjectionMatrix();
        },
      };
    },
  },
};
