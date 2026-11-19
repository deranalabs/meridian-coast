// Shop screenshot scene: Ilo outside Saltwater Threads at dusk, previewing a blazer in the open clothing menu.

const STEPS = 70;
const PICK = 11;

/** Scripted input: ArrowDown on alternate steps until `PICK` presses have gone through, nothing held. */
function browse(index) {
  const press = index >= 4 && index < 4 + PICK * 2 && index % 2 === 0;
  return {
    pressed: (code) => press && code === 'ArrowDown',
    down: () => false,
    axis: () => 0,
    mouse: { dx: 0, dy: 0 },
    consume: () => {},
  };
}

export const SHOP_SHOTS = {
  shop: {
    time: 'dusk',
    steps: STEPS,
    focus: [292, 0, -85],
    stage(game) {
      const shops = game.services.shops;
      const place = shops.places.find((entry) => entry.kind === 'clothes');
      const x = place.x + place.outX * 1.6;
      const z = place.z + place.outZ * 1.6;
      game.player.placeOnFoot(x, z, place.heading + 0.3);
      game.player.state.wallet.cash = 2480;
      shops.open(place);
      for (const car of game.fleet.cars) {
        if (Math.hypot(car.position.x - x, car.position.z - z) < 14) car.visible = false;
      }
      game.cameraMode = 'manual';
      const sideX = place.outZ;
      const sideZ = -place.outX;
      return {
        input: browse,
        afterStep(index) {
          if (index !== STEPS - 1) return;
          const p = game.ilo.position;
          const at = (out, side) => [p.x + place.outX * out + sideX * side, p.z + place.outZ * out + sideZ * side];
          const [cx, cz] = at(5.6, 0.9);
          const [lx, lz] = at(-0.6, 1.9);
          game.camera.position.set(cx, p.y + 2.3, cz);
          game.camera.lookAt(lx, p.y + 0.85, lz);
          game.camera.fov = 42;
          game.camera.updateProjectionMatrix();
        },
      };
    },
  },
};
