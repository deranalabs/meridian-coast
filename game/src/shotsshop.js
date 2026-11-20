// Shop screenshot scene: Ilo outside Saltwater Threads in late golden light with $2,480 and the clothes menu open.
import { PLACES } from './data/places.js';

const CLOTHES = PLACES.find((place) => place.id === 'clothes');
const STEPS = 45;
const CLEAR_RADIUS = 14;

function hideCarsNear(game, x, z) {
  for (const car of game.fleet.cars) {
    if (Math.hypot(car.position.x - x, car.position.z - z) < CLEAR_RADIUS) car.visible = false;
  }
}

/** The camera stands on the street in front of Ilo and looks a little to one side, leaving the right for the menu. */
function frameShopper(game) {
  const p = game.ilo.position;
  const fx = Math.sin(game.ilo.heading);
  const fz = Math.cos(game.ilo.heading);
  game.camera.position.set(p.x + fx * 4.4 - fz * 0.6, p.y + 1.6, p.z + fz * 4.4 + fx * 0.6);
  game.camera.lookAt(p.x + fz * 1.3, p.y + 1.05, p.z - fx * 1.3);
  game.camera.fov = 42;
  game.camera.updateProjectionMatrix();
}

export const SHOP_SHOTS = {
  shop: {
    time: 'golden',
    steps: STEPS,
    focus: [CLOTHES.near[0], 0, CLOTHES.near[1]],
    stage(game) {
      const shops = game.services.shops;
      const place = shops.places.find((entry) => entry.id === 'clothes');
      // Facing out of the door, so the shopfront and its sign glow behind him.
      game.player.placeOnFoot(place.x + place.outX * 0.6, place.z + place.outZ * 0.6, place.heading);
      game.player.state.wallet.cash = 2480;
      shops.open(place);
      // Ilo stands in the door marker; with the menu open it would only veil the outfit in pink.
      shops.markers.mesh.visible = false;
      hideCarsNear(game, game.ilo.position.x, game.ilo.position.z);
      game.cameraMode = 'manual';
      return {
        afterStep(index) {
          if (index !== STEPS - 1) return;
          hideCarsNear(game, game.ilo.position.x, game.ilo.position.z);
          frameShopper(game);
        },
      };
    },
  },
};
