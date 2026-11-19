// Cutscene camera: a slow two-shot dolly between Ilo and whoever he talks to, with letterbox bars on the HUD.
import * as THREE from '../../vendor/three.module.min.js';

const SIDE = 4.2;
const HEIGHT = 1.75;
const DRIFT = 0.07;

/** Cutscenes over `game`; begin(focus) takes the camera, update(dt) moves it, end() gives it back. */
export function createCutscene(game) {
  const state = { active: false, time: 0, side: 1, focus: new THREE.Vector3(), mid: new THREE.Vector3() };
  const look = new THREE.Vector3();
  const subject = () => (game.player.state.car ? game.player.state.car.position : game.ilo.position);

  function frame() {
    const from = subject();
    const to = state.focus;
    state.mid.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    let dx = to.x - from.x;
    let dz = to.z - from.z;
    const length = Math.hypot(dx, dz) || 1;
    dx /= length;
    dz /= length;
    const swing = Math.sin(state.time * DRIFT * 6) * 0.25 + state.time * DRIFT;
    const across = SIDE + Math.min(6, length * 0.6);
    const nx = -dz * state.side;
    const nz = dx * state.side;
    game.camera.position.set(state.mid.x + nx * across + dx * swing * 3, state.mid.y + HEIGHT,
      state.mid.z + nz * across + dz * swing * 3);
    look.set(state.mid.x, state.mid.y + 1.45, state.mid.z);
    game.camera.lookAt(look);
  }

  return {
    state,
    get active() {
      return state.active;
    },
    /** Take the camera for a scene looking at `focus` ({x, y?, z}); alternate sides between scenes. */
    begin(focus) {
      const from = subject();
      state.focus.set(focus?.x ?? from.x + 2, focus?.y ?? from.y, focus?.z ?? from.z + 2);
      state.time = 0;
      state.side = -state.side;
      const blocked = (side) => {
        const dx = state.focus.x - from.x;
        const dz = state.focus.z - from.z;
        const length = Math.hypot(dx, dz) || 1;
        const reach = SIDE + Math.min(6, length * 0.6) + 1;
        const mx = (from.x + state.focus.x) / 2;
        const mz = (from.z + state.focus.z) / 2;
        return game.colliders.segmentHit(mx, mz, mx - (dz / length) * side * reach, mz + (dx / length) * side * reach,
          0.4) < 1;
      };
      if (blocked(state.side) && !blocked(-state.side)) state.side = -state.side;
      state.active = true;
      game.cameraMode = 'cutscene';
      game.hud.root.classList.add('cutscene');
      frame();
    },
    update(dt) {
      if (!state.active) return;
      state.time += dt;
      frame();
    },
    end() {
      if (!state.active) return;
      state.active = false;
      if (game.cameraMode === 'cutscene') game.cameraMode = 'auto';
      game.hud.root.classList.remove('cutscene');
      if (game.player.state.mode === 'driving') game.chase.snap();
    },
  };
}
