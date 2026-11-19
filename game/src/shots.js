// Deterministic screenshot scenes behind ?shot=<name>&seed=N: each sets time of day, actors and camera.

/**
 * Each scene names its time of day and a stage(game) function that places actors and the camera after the
 * world is built; `steps` fixed simulation steps then run before the frame is captured.
 */
export const SHOTS = {
  drive: {
    time: 'dusk',
    steps: 240,
    stage(game) {
      game.camera.position.set(60, 3.2, -60 + 5);
      game.camera.lookAt(-40, 6, -62);
    },
  },
  foot: {
    time: 'night',
    steps: 120,
    stage(game) {
      game.camera.position.set(-30, 2.2, 22);
      game.camera.lookAt(-60, 5, 20);
    },
  },
  title: {
    time: 'dusk',
    steps: 60,
    stage(game) {
      game.camera.position.set(430, 22, 60);
      game.camera.lookAt(200, 30, -120);
    },
  },
};

export function getShot(name) {
  return SHOTS[name] ?? null;
}
