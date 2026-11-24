// Street screenshot scene: White Van, job 3 of 8, on foot in Harbor Row at dusk. The escort is down, Ilo walks
// to the Brinewater Cold Store door, Juno asks what is in the van, and the district banner is up. The block is
// busy: people on the pavement by the shop fronts, cars in both lanes, and a patrol car with its bar lit that has
// heard the escort go down (two stars).
import { STORY_POINTS, seedStory } from './shotsstory.js';
import { storyPlaces } from './missions/setup.js';
import { MISSION_PLACES } from './data/places.js';

const JOB = 'white-van';
const CARGO_STAGE = 3;
const STORE = MISSION_PLACES.find((place) => place.id === 'cold-store');
/** Ilo's distance out from the door; the camera's distance behind him, its side step and its height. */
const STREET = { out: 7.5, back: 4.2, side: 1.5, height: 1.8, steps: 60 };
const STARS = 2;
const PAINTS = ['#e63946', '#f4f1ea', '#3a86ff', '#ffd23f', '#2ec4b6'];

// [metres out from the shop fronts, metres along the street (screen right is +), facing]: walkers on the pavement
// going both ways, a pair talking by a door, and a few across the road.
const WALKERS = [
  [1.6, -4, 1], [2.4, -5.6, -1], [1.5, -8, -1], [2.7, -9.2, 1], [2.0, -2.6, 1], [2.9, 2.4, -1],
  [1.6, 3.2, -1], [2.5, 4.4, 1], [1.8, 6.2, -1], [2.6, 8, 1], [1.5, 10, -1], [2.2, 12, 1],
];
// [metres out, metres along, facing, type]: cars in the two lanes, one each way, spaced like moving traffic.
const CARS = [[4.3, -12.5, 1, 'sedan'], [6.0, -18.5, -1, 'coupe'], [4.1, -24, 1, 'pickup'], [4.6, 6.5, 1, 'sedan']];
/** The patrol car pulled in down the block, nose toward Ilo. */
const PATROL = { out: 5.6, along: -5, turn: 0.6 };

export const STREET_SHOTS = {
  street: {
    time: 'golden',
    steps: STREET.steps,
    focus: [STORE.near[0], 0, STORE.near[1]],
    stage(game) {
      seedStory(game, STORY_POINTS.thirdJob);
      const store = storyPlaces(game).get(STORE.id);
      const x = store.x + store.outX * STREET.out;
      const z = store.z + store.outZ * STREET.out;
      game.player.placeOnFoot(x, z, Math.atan2(-store.outX, -store.outZ));
      game.missions.jump(JOB, CARGO_STAGE);
      game.hud.announcePlace();
      game.cameraMode = 'manual';
      const side = { x: store.outZ, z: -store.outX };
      const at = (out, along) => ({ x: store.x + store.outX * out + side.x * along,
        z: store.z + store.outZ * out + side.z * along });
      const alongHeading = (facing) => Math.atan2(side.x * facing, side.z * facing);
      const cars = CARS.map(([out, along, facing, type], index) => {
        const car = game.fleet.add(type, PAINTS[index % PAINTS.length]);
        if (!car) return null;
        const p = at(out, along);
        car.position.set(p.x, 0, p.z);
        car.heading = alongHeading(facing);
        car.parked = true;
        return car;
      });
      const { police } = game.action;
      const patrolAt = at(PATROL.out, PATROL.along);
      const unit = police.units.adopt(game.fleet.reuse('cruiser', '#16203a'), patrolAt.x, patrolAt.z,
        alongHeading(1) + PATROL.turn);
      const placeTraffic = () => {
        cars.forEach((car, index) => {
          if (!car) return;
          const [out, along, facing] = CARS[index];
          const p = at(out, along);
          car.position.set(p.x, 0, p.z);
          car.heading = alongHeading(facing);
        });
        Object.assign(unit.vehicle, { x: patrolAt.x, z: patrolAt.z, heading: alongHeading(1) + PATROL.turn,
          vx: 0, vz: 0, speed: 0, yawRate: 0 });
      };
      const placeCrowd = () => WALKERS.forEach(([out, along, facing], index) => {
        const ped = game.pedestrians.peds[index];
        if (!ped) return;
        const p = at(out, along);
        ped.character.position.set(p.x, game.ground.surfaceAt(p.x, p.z).height, p.z);
        ped.character.heading = alongHeading(facing);
      });
      placeCrowd();
      return {
        afterStep(index) {
          if (index === STREET.steps - 2) {
            police.setStars(STARS);
            placeTraffic();
            placeCrowd();
          }
          if (index !== STREET.steps - 1) return;
          if (!game.dialogue.conversation.complete) game.dialogue.conversation.skip();
          // Over his right shoulder, a step out into the street, looking past him at the store front.
          const y = game.ground.surfaceAt(x, z).height;
          const cam = game.camera;
          cam.position.set(x + store.outX * STREET.back + side.x * STREET.side, y + STREET.height,
            z + store.outZ * STREET.back + side.z * STREET.side);
          cam.up.set(0, 1, 0);
          cam.lookAt(store.x - side.x * 2, y + 2.4, store.z - side.z * 2);
          cam.fov = 62;
          cam.updateProjectionMatrix();
        },
      };
    },
  },
};
