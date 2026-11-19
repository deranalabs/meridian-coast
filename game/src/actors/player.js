// The player, Ilo Rask: walking and running on foot, aiming, and entering, driving and leaving cars with E.
import { createVehicleState, stepVehicle } from '../vehicles/driving.js';
import { createWallet } from '../economy/wallet.js';
import { createVitals } from '../combat/vitals.js';
import { createArsenal } from '../combat/arsenal.js';

const WALK = 1.7;
const RUN = 5.6;
const CROUCH = 1.1;
const RADIUS = 0.35;
const ENTER_RANGE = 3.6;
const ENTER_SECONDS = 0.9;

function doorPoint(car) {
  const h = car.heading;
  const side = car.spec.width / 2 + 0.55;
  return { x: car.position.x + Math.cos(h) * side + Math.sin(h) * 0.25, z: car.position.z - Math.sin(h) * side +
    Math.cos(h) * 0.25 };
}

/**
 * Wires Ilo's character to input, the fleet, colliders and ground. mode is 'foot', 'entering', 'driving'
 * or 'exiting'; update(dt, input, cameraYaw) runs one step and returns events such as {entered: car}.
 */
export function createPlayer(character, { fleet, colliders, ground, smoke, traffic }, hooks = {}) {
  const state = {
    mode: 'foot',
    car: null,
    vehicle: null,
    timer: 0,
    wallet: createWallet(2480),
    vitals: createVitals(),
    arsenal: createArsenal(),
    autopilot: null,
    aiming: false,
    crouch: false,
    inCover: false,
    actionTimer: 0,
    down: false,
    frozen: false,
  };

  function groundY(x, z) {
    return ground.surfaceAt(x, z).height;
  }

  function nearestCar() {
    let best = null;
    let bestDistance = ENTER_RANGE;
    for (const car of fleet.cars) {
      if (!car.visible) continue;
      const door = doorPoint(car);
      const d = Math.hypot(door.x - character.position.x, door.z - character.position.z);
      if (d < bestDistance) {
        bestDistance = d;
        best = car;
      }
    }
    return best;
  }

  function takeCar(car) {
    hooks.onTakeCar?.(car);
    traffic?.release(car);
    state.car = car;
    state.vehicle = createVehicleState(car.spec, car.position.x, car.position.z, car.heading);
  }

  /** Put Ilo straight into a car (used by scenes and spawns). */
  function enterNow(car) {
    takeCar(car);
    state.mode = 'driving';
    character.visible = false;
  }

  function updateFoot(dt, input, cameraYaw) {
    const forward = input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
    const strafe = input.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
    const running = input.down('ShiftLeft', 'ShiftRight');
    const aiming = input.down('KeyQ', 'Mouse2');
    if (input.pressed('KeyC')) state.crouch = !state.crouch;
    if (running && forward !== 0) state.crouch = false;
    state.aiming = aiming;
    const moving = forward !== 0 || strafe !== 0;
    const speed = moving ? (state.crouch ? CROUCH : running && !aiming ? RUN : WALK) : 0;
    if (moving) {
      const rightX = -Math.cos(cameraYaw);
      const rightZ = Math.sin(cameraYaw);
      let dx = Math.sin(cameraYaw) * forward + rightX * strafe;
      let dz = Math.cos(cameraYaw) * forward + rightZ * strafe;
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      let x = character.position.x + dx * speed * dt;
      let z = character.position.z + dz * speed * dt;
      const pushed = colliders.resolveCircle(x, z, RADIUS);
      if (ground.surfaceAt(pushed.x, pushed.z).kind !== 'water') {
        x = pushed.x;
        z = pushed.z;
        character.position.x = x;
        character.position.z = z;
      }
      if (!aiming) {
        const target = Math.atan2(dx, dz);
        let delta = Math.atan2(Math.sin(target - character.heading), Math.cos(target - character.heading));
        character.heading += delta * Math.min(1, dt * 10);
      }
    }
    if (aiming) character.heading = cameraYaw;
    character.position.y = groundY(character.position.x, character.position.z);
    character.speed = speed;
    state.actionTimer = Math.max(0, state.actionTimer - dt);
    state.shootTimer = Math.max(0, (state.shootTimer ?? 0) - dt);
    const raised = aiming || state.shootTimer > 0;
    if (state.actionTimer > 0) character.speed = 0;
    else if (state.crouch) character.play(raised ? 'aim' : 'crouch');
    else character.play(raised ? 'aim' : speed > 3 ? 'run' : speed > 0 ? 'walk' : 'idle');
    if (input.pressed('KeyE')) {
      const car = nearestCar();
      if (car) {
        takeCar(car);
        state.mode = 'entering';
        state.timer = 0;
        character.play('enter');
      }
    }
  }

  function updateEntering(dt) {
    state.timer += dt;
    const door = doorPoint(state.car);
    const t = Math.min(1, state.timer / 0.35);
    character.position.x += (door.x - character.position.x) * t;
    character.position.z += (door.z - character.position.z) * t;
    character.heading = state.car.heading + Math.PI / 2;
    character.speed = 0;
    if (state.timer > ENTER_SECONDS) {
      state.mode = 'driving';
      character.visible = false;
      return { entered: state.car };
    }
    return null;
  }

  function updateDriving(dt, input) {
    const controls = state.autopilot ? state.autopilot() : {
      throttle: input.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']),
      steer: input.axis(['KeyD', 'ArrowRight'], ['KeyA', 'ArrowLeft']),
      handbrake: input.down('Space'),
    };
    driveStep(dt, controls);
    if (input.pressed('KeyE') && Math.abs(state.vehicle.speed) < 4) {
      state.mode = 'exiting';
      state.timer = 0;
      const door = doorPoint(state.car);
      character.position.set(door.x, groundY(door.x, door.z), door.z);
      character.heading = state.car.heading + Math.PI / 2;
      character.visible = true;
      character.play('exit');
    }
  }

  /** One physics step of the player's car from an input; also used by scripted scenes. */
  function driveStep(dt, controls) {
    const v = state.vehicle;
    stepVehicle(v, controls, dt, (x, z, r) => colliders.resolveCircle(x, z, r),
      (x, z) => ground.surfaceAt(x, z).kind === 'water');
    const car = state.car;
    const front = groundY(v.x + Math.sin(v.heading) * 1.4, v.z + Math.cos(v.heading) * 1.4);
    const back = groundY(v.x - Math.sin(v.heading) * 1.4, v.z - Math.cos(v.heading) * 1.4);
    car.position.set(v.x, (front + back) / 2, v.z);
    car.heading = v.heading;
    car.pitch = -Math.atan2(front - back, 2.8);
    car.roll += (Math.max(-0.07, Math.min(0.07, v.lateral * -0.012)) - car.roll) * Math.min(1, dt * 6);
    car.steer = v.steer;
    car.spin = v.spin;
    character.position.set(v.x, car.position.y, v.z);
    if (v.slip > 2.8 && Math.abs(v.speed) > 4 && smoke) {
      const h = v.heading;
      for (const side of [-1, 1]) {
        const wx = v.x - Math.sin(h) * 1.3 + Math.cos(h) * side * 0.8;
        const wz = v.z - Math.cos(h) * 1.3 - Math.sin(h) * side * 0.8;
        smoke.emit(wx, car.position.y, wz, Math.min(2, v.slip / 6));
      }
    }
  }

  function updateExiting(dt) {
    state.timer += dt;
    character.speed = 0;
    if (state.timer > ENTER_SECONDS) {
      state.mode = 'foot';
      state.car = null;
      state.vehicle = null;
      character.play('idle');
    }
  }

  return {
    state,
    character,
    enterNow,
    driveStep,
    /** Put Ilo on foot at (x, z) facing `heading`, out of any car (respawns, busted, loading a save). */
    placeOnFoot(x, z, heading = 0) {
      state.mode = 'foot';
      state.car = null;
      state.vehicle = null;
      state.autopilot = null;
      state.crouch = false;
      character.visible = true;
      character.position.set(x, groundY(x, z), z);
      character.heading = heading;
      character.play('idle');
    },
    update(dt, input, cameraYaw) {
      if (state.down || state.frozen) return null;
      if (state.mode === 'foot') updateFoot(dt, input, cameraYaw);
      else if (state.mode === 'entering') return updateEntering(dt);
      else if (state.mode === 'driving') updateDriving(dt, input);
      else if (state.mode === 'exiting') updateExiting(dt);
      return null;
    },
    get speed() {
      return state.vehicle ? state.vehicle.speed : character.speed;
    },
  };
}
