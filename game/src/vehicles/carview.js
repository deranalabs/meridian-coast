// The car's camera views as pure rules: the order V cycles, where each sits in the car, and the turn of the head.

export const CAR_VIEWS = Object.freeze(['chase', 'driver', 'bonnet']);

const LOOK_YAW = 0.6;
const LOOK_PITCH = 0.26;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** The view after `view` in the cycle. */
export function nextCarView(view) {
  return CAR_VIEWS[(CAR_VIEWS.indexOf(view) + 1) % CAR_VIEWS.length];
}

/**
 * Where a view's eye is in the car's own frame (+x the car's left, +z forward), with its lens. The sway grows
 * with speed and runs on game time alone, so the same step always gives the same picture.
 */
export function viewPose(spec, view, speed, time) {
  const pace = Math.min(1, Math.abs(speed) / 30);
  const swayX = Math.sin(time * 4.3) * 0.012 * pace;
  const swayY = Math.sin(time * 8.9) * 0.007 * pace;
  if (view === 'bonnet') {
    return { x: swayX, y: spec.belt + (spec.roof - spec.belt) * 0.72 + swayY, z: spec.glassFront + 0.22,
      fov: 60 + 12 * pace };
  }
  return { x: spec.width * 0.19 + swayX, y: spec.belt + (spec.roof - spec.belt) * 0.71 + swayY,
    z: spec.roofFront - 0.27, fov: 62 + 13 * pace };
}

/** One step of mouse look in a car: a short turn of the head that drifts back to the road. */
export function turnHead(head, mouse, dt) {
  const settle = mouse.dx || mouse.dy ? 1 : Math.exp(-1.4 * dt);
  head.yaw = clamp(head.yaw * settle - mouse.dx * 0.0022, -LOOK_YAW, LOOK_YAW);
  head.pitch = clamp(head.pitch * settle - mouse.dy * 0.0018, -LOOK_PITCH, LOOK_PITCH);
  return head;
}
