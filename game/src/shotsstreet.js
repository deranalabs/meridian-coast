// Street screenshot scene: White Van, job 3 of 8, on foot in Harbor Row at dusk. The escort is down, Ilo walks
// to the Brinewater Cold Store door, Juno asks what is in the van, and the district banner is up.
import { STORY_POINTS, seedStory } from './shotsstory.js';
import { storyPlaces } from './missions/setup.js';
import { MISSION_PLACES } from './data/places.js';

const JOB = 'white-van';
const CARGO_STAGE = 3;
const STORE = MISSION_PLACES.find((place) => place.id === 'cold-store');
/** Ilo's distance out from the door; the camera's distance behind him, its side step and its height. */
const STREET = { out: 7.5, back: 4.2, side: 1.5, height: 1.8, steps: 60 };

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
      return {
        afterStep(index) {
          if (index !== STREET.steps - 1) return;
          if (!game.dialogue.conversation.complete) game.dialogue.conversation.skip();
          // Over his right shoulder, a step out into the street, looking past him at the store front.
          const side = { x: store.outZ, z: -store.outX };
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
