// Cameras: a low, close chase camera for cars and an over-the-shoulder orbit camera on foot.
import * as THREE from '../../vendor/three.module.min.js';

const tempTarget = new THREE.Vector3();
const tempDesired = new THREE.Vector3();

/** Chase camera: sits low behind the car, springs toward it and widens its field of view with speed. */
export function createChaseCamera(camera) {
  const state = { yawLag: 0, initialised: false, fov: camera.fov };
  return {
    snap() {
      state.initialised = false;
    },
    update(car, speed, dt, { distance = 4.7, height = 1.42, look = 1.3, yawOffset = 0 } = {}) {
      const heading = car.heading + yawOffset;
      const first = !state.initialised;
      if (first) {
        state.yawLag = heading;
        state.initialised = true;
      }
      let delta = heading - state.yawLag;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      state.yawLag += delta * Math.min(1, dt * 4.5);
      const back = distance + Math.min(1.2, Math.abs(speed) * 0.02);
      tempDesired.set(
        car.position.x - Math.sin(state.yawLag) * back,
        car.position.y + height,
        car.position.z - Math.cos(state.yawLag) * back,
      );
      if (dt <= 0 || first) camera.position.copy(tempDesired);
      else camera.position.lerp(tempDesired, Math.min(1, dt * 16));
      tempTarget.set(
        car.position.x + Math.sin(car.heading) * 2.5,
        car.position.y + look,
        car.position.z + Math.cos(car.heading) * 2.5,
      );
      camera.lookAt(tempTarget);
      const targetFov = 55 + Math.min(10, Math.abs(speed) * 0.2);
      state.fov += (targetFov - state.fov) * Math.min(1, dt * 3);
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    },
  };
}

/** Orbit camera on foot: mouse turns yaw/pitch, it sits over the right shoulder and avoids going under ground. */
export function createFootCamera(camera) {
  const state = { yaw: 0, pitch: 0.12, distance: 3.4 };
  return {
    state,
    setYaw(yaw) {
      state.yaw = yaw;
    },
    update(subject, mouse, dt, groundHeight) {
      state.yaw -= mouse.dx * 0.0025;
      state.pitch = Math.max(-0.35, Math.min(0.9, state.pitch + mouse.dy * 0.002));
      const shoulder = 0.55;
      const cosPitch = Math.cos(state.pitch);
      const x = subject.x - Math.sin(state.yaw) * state.distance * cosPitch - Math.cos(state.yaw) * shoulder;
      const z = subject.z - Math.cos(state.yaw) * state.distance * cosPitch + Math.sin(state.yaw) * shoulder;
      const y = Math.max(groundHeight(x, z) + 0.4, subject.y + 1.65 + Math.sin(state.pitch) * state.distance);
      tempDesired.set(x, y, z);
      if (dt <= 0) camera.position.copy(tempDesired);
      else camera.position.lerp(tempDesired, Math.min(1, dt * 12));
      tempTarget.set(
        subject.x - Math.cos(state.yaw) * shoulder * 0.6 + Math.sin(state.yaw) * 2,
        subject.y + 1.45,
        subject.z + Math.sin(state.yaw) * shoulder * 0.6 + Math.cos(state.yaw) * 2,
      );
      camera.lookAt(tempTarget);
      camera.fov += (60 - camera.fov) * Math.min(1, dt * 3);
      camera.updateProjectionMatrix();
    },
  };
}
