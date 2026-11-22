// Shop screenshot scene: Ilo outside Halcyon Arms in golden light with three jobs done and the gun menu open.
import { PLACES } from './data/places.js';
import { STORY_POINTS, seedStory } from './shotsstory.js';

const GUN_SHOP = PLACES.find((place) => place.id === 'gun');
const STEPS = 45;
const CLEAR_RADIUS = 14;
/** Where Ilo stands, metres out from the door and along the front: clear of the palm, 2.15 m from the door. */
const STAND = { out: 1.62, along: 1.41 };
const SHOPFRONT_LIGHT = '#ffb468';
const SHOPFRONT_LEVEL = 22;
const GOLDEN_FILL = '#ffc98c';
const GOLDEN_BOUNCE = '#b07848';
const GOLDEN_FILL_LEVEL = 3.1;
/** The step on which the menu moves from the pistol he owns down to the SMG he can buy. */
const CHOOSE_STEP = 3;

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
  game.camera.lookAt(p.x + fz * 1.45, p.y + 1.08, p.z - fx * 1.45);
  game.camera.fov = 42;
  game.camera.updateProjectionMatrix();
}

/** One press of the menu's down key on step `at`, and nothing else. */
const pressDownOnce = (at) => (index) => ({
  pressed: (code) => index === at && code === 'ArrowDown',
  down: () => false,
  axis: () => 0,
  mouse: { dx: 0, dy: 0 },
});

export const SHOP_SHOTS = {
  shop: {
    time: 'golden',
    steps: STEPS,
    focus: [GUN_SHOP.near[0], 0, GUN_SHOP.near[1]],
    stage(game) {
      const shops = game.services.shops;
      const place = shops.places.find((entry) => entry.id === GUN_SHOP.id);
      // The fourth-job point shows all three states: the pistol owned, the SMG for sale, the shotgun rank locked.
      seedStory(game, STORY_POINTS.fourthJob);
      // A step from the door, inside the 2.2 m from which E opens the menu, half turned down the street: the lit
      // shopfront runs away behind him to the sunlit towers, and its warm light falls on him (the key light, up).
      const along = { x: place.outZ, z: -place.outX };
      game.player.placeOnFoot(place.x + place.outX * STAND.out + along.x * STAND.along,
        place.z + place.outZ * STAND.out + along.z * STAND.along, place.heading - 0.95);
      game.lighting.key.color.set(SHOPFRONT_LIGHT);
      game.lighting.key.intensity = SHOPFRONT_LEVEL;
      // The street lies in the towers' shade at this hour: the sky fill carries the gold the sun lays on them.
      game.lighting.hemi.color.set(GOLDEN_FILL);
      game.lighting.hemi.groundColor.set(GOLDEN_BOUNCE);
      game.lighting.hemi.intensity = GOLDEN_FILL_LEVEL;
      shops.open(place);
      // Ilo stands in the door marker; with the menu open it would only veil him in red.
      shops.markers.mesh.visible = false;
      hideCarsNear(game, game.ilo.position.x, game.ilo.position.z);
      game.cameraMode = 'manual';
      return {
        input: pressDownOnce(CHOOSE_STEP),
        afterStep(index) {
          if (index !== STEPS - 1) return;
          hideCarsNear(game, game.ilo.position.x, game.ilo.position.z);
          frameShopper(game);
        },
      };
    },
  },
};
