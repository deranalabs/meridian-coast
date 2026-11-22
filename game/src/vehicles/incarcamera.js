// The cameras on the car itself: holds the view V picked, rides the body, and swaps it for the cockpit in the seat.
import * as THREE from '../../vendor/three.module.min.js';
import { CAR_VIEWS, nextCarView, turnHead, viewPose } from './carview.js';
import { createCockpit } from './cockpit.js';

/** createInCarCamera(camera) → {group, state, cycle(), active(), sync(car), update(...)}; chase is the default. */
export function createInCarCamera(camera) {
  const cockpit = createCockpit();
  const state = { view: CAR_VIEWS[0], head: { yaw: 0, pitch: 0 }, fov: 0 };
  const body = new THREE.Euler(0, 0, 0, 'YXZ');
  const look = new THREE.Euler(0, 0, 0, 'YXZ');
  const turn = new THREE.Quaternion();
  const eye = new THREE.Vector3();
  let hidden = null;

  return {
    group: cockpit.group,
    state,
    cycle() {
      state.view = nextCarView(state.view);
      state.head.yaw = 0;
      state.head.pitch = 0;
      state.fov = 0;
      return state.view;
    },
    active: () => state.view !== 'chase',
    /** Before the fleet draws: hide the body of `car` (the one Ilo drives, or null) when the eye is inside it. */
    sync(car) {
      const inside = car && state.view === 'driver' ? car : null;
      if (hidden && hidden !== inside) hidden.bodyHidden = false;
      hidden = inside;
      if (inside) inside.bodyHidden = true;
      else cockpit.hide();
    },
    update(car, speed, time, dt, mouse) {
      const pose = viewPose(car.spec, state.view, speed, time);
      turnHead(state.head, mouse, dt);
      body.set(car.pitch, car.heading, car.roll);
      camera.position.copy(eye.set(pose.x, pose.y, pose.z).applyEuler(body)).add(car.position);
      look.set(state.head.pitch, Math.PI + state.head.yaw, 0);
      camera.quaternion.setFromEuler(body).multiply(turn.setFromEuler(look));
      state.fov = state.fov ? state.fov + (pose.fov - state.fov) * Math.min(1, dt * 3) : pose.fov;
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
      if (state.view === 'driver') cockpit.show(car);
    },
  };
}
