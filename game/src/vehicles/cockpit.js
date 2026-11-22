// What the driver's seat shows of the car: a dark dash and wheel, the windscreen's frame, the painted bonnet.
import * as THREE from '../../vendor/three.module.min.js';

const DASH = '#15121c';
const LINING = '#1d1a24';

/**
 * The parts for one car type, in the car's frame. The body itself is hidden while this shows, since the eye is
 * inside it; the glass becomes the open front of the cabin, so the road reads.
 */
function buildParts(spec, materials) {
  const group = new THREE.Group();
  const front = spec.glassFront;
  const half = spec.width * 0.43;
  const add = (geometry, material, x, y, z, tilt = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = tilt;
    group.add(mesh);
    return mesh;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  const noseEnd = spec.length / 2 - 0.22;
  const drop = spec.belt - spec.hood;
  const run = noseEnd - front;
  add(box(spec.width - 0.22, 0.05, Math.hypot(run, drop)), materials.paint,
    0, (spec.belt + spec.hood) / 2 - 0.04, (front + noseEnd) / 2, Math.atan2(drop, run));

  const driver = spec.width * 0.19;
  add(box(half * 2 + 0.06, 0.12, 0.26), materials.dash, 0, spec.belt - 0.06, front - 0.14);
  add(box(0.36, 0.08, 0.12), materials.dash, driver, spec.belt + 0.01, front - 0.22);
  add(box(0.26, 0.012, 0.012), materials.dial, driver, spec.belt + 0.022, front - 0.286);

  const height = spec.roof - spec.belt;
  const back = spec.roofFront - front;
  for (const side of [-1, 1]) {
    add(box(0.075, Math.hypot(height, back), 0.07), materials.lining,
      side * half, (spec.belt + spec.roof) / 2 - 0.01, (front + spec.roofFront) / 2, Math.atan2(back, height));
    add(box(0.09, 0.07, front - spec.glassRear), materials.lining,
      side * half, spec.belt - 0.04, (front + spec.glassRear) / 2);
    add(box(0.07, height, 0.11), materials.lining, side * half, spec.belt + height / 2, spec.roofFront - 0.85);
    add(box(0.15, 0.09, 0.12), materials.paint, side * (spec.width / 2 + 0.05), spec.belt + 0.07, front - 0.08);
  }
  const roofLength = spec.roofFront - spec.roofRear;
  add(box(half * 2, 0.035, roofLength), materials.lining, 0, spec.roof + 0.01, spec.roofFront - roofLength / 2);
  add(box(0.2, 0.05, 0.02), materials.dash, 0, spec.roof - 0.015, spec.roofFront + 0.06);

  const column = new THREE.Group();
  group.add(column);
  column.position.set(driver, spec.belt - 0.12, front - 0.36);
  column.rotation.x = 0.35;
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.017, 6, 22), materials.dash));
  wheel.add(new THREE.Mesh(box(0.32, 0.035, 0.02), materials.dash));
  column.add(wheel);
  return { group, wheel };
}

/** createCockpit() → {group, show(car), hide()}: one cockpit, rebuilt only when the type of car changes. */
export function createCockpit() {
  const group = new THREE.Group();
  group.name = 'cockpit';
  group.visible = false;
  group.rotation.order = 'YXZ';
  const materials = {
    paint: new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.45 }),
    dash: new THREE.MeshStandardMaterial({ color: DASH, roughness: 0.95 }),
    lining: new THREE.MeshStandardMaterial({ color: LINING, roughness: 0.95 }),
    dial: new THREE.MeshStandardMaterial({ color: '#3fe0d0', emissive: '#3fe0d0', emissiveIntensity: 1.2 }),
  };
  let built = null;
  let type = null;

  return {
    group,
    show(car) {
      if (type !== car.type) {
        if (built) {
          group.remove(built.group);
          built.group.traverse((part) => part.geometry?.dispose());
        }
        built = buildParts(car.spec, materials);
        group.add(built.group);
        type = car.type;
      }
      materials.paint.color.copy(car.colour);
      group.position.copy(car.position);
      group.rotation.set(car.pitch, car.heading, car.roll);
      built.wheel.rotation.z = -car.steer * 4;
      group.visible = true;
    },
    hide() {
      group.visible = false;
    },
  };
}
