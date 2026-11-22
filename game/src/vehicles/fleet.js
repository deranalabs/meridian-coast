// Fleet renderer: every car (parked, traffic, player) as instances, one draw per type plus one for wheels.
import * as THREE from '../../vendor/three.module.min.js';
import { CAR_TYPES, TYPE_NAMES, buildCarGeometry, buildWheelGeometry } from './carmodels.js';
import { createCarMaterial } from './carmaterial.js';

const WHEEL_MODEL_RADIUS = 0.34;

/** add(type, colour) returns a car record {position, heading, pitch, roll, steer, spin, visible}. */
export function createFleet(capacityPerType, noiseTexture, timeOfDay) {
  const group = new THREE.Group();
  group.name = 'fleet';
  const material = createCarMaterial(noiseTexture, timeOfDay.lampLevel);
  const meshes = {};
  const counts = {};
  for (const type of TYPE_NAMES) {
    const mesh = new THREE.InstancedMesh(buildCarGeometry(type), material, capacityPerType);
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.setColorAt(0, new THREE.Color('#ffffff'));
    mesh.name = `cars-${type}`;
    meshes[type] = mesh;
    counts[type] = 0;
    group.add(mesh);
  }
  const wheelMaterial = createCarMaterial(noiseTexture, 0);
  const wheels = new THREE.InstancedMesh(buildWheelGeometry(), wheelMaterial, capacityPerType * TYPE_NAMES.length * 4);
  wheels.count = 0;
  wheels.castShadow = true;
  wheels.frustumCulled = false;
  wheels.setColorAt(0, new THREE.Color('#ffffff'));
  wheels.name = 'wheels';
  group.add(wheels);

  const cars = [];
  const matrix = new THREE.Matrix4();
  const wheelMatrix = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const unit = new THREE.Vector3(1, 1, 1);
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  return {
    group,
    cars,
    add(type, colour) {
      if (counts[type] >= capacityPerType) return null;
      const spec = CAR_TYPES[type];
      const car = {
        type,
        spec,
        index: counts[type],
        position: new THREE.Vector3(),
        heading: 0,
        pitch: 0,
        roll: 0,
        steer: 0,
        spin: 0,
        visible: true,
        colour: new THREE.Color(colour),
      };
      counts[type] += 1;
      meshes[type].count = counts[type];
      meshes[type].setColorAt(car.index, car.colour);
      meshes[type].instanceColor.needsUpdate = true;
      cars.push(car);
      wheels.count = cars.length * 4;
      return car;
    },
    /** Repaint a car (the spray bay uses this). */
    setColour(car, colour) {
      car.colour.set(colour);
      meshes[car.type].setColorAt(car.index, car.colour);
      meshes[car.type].instanceColor.needsUpdate = true;
    },
    /** A free (hidden, unused) car of `type`, or a new one; used to spawn police and bought cars. */
    reuse(type, colour) {
      const spare = cars.find((car) => car.type === type && car.spare);
      if (!spare) return this.add(type, colour);
      spare.spare = false;
      spare.visible = true;
      this.setColour(spare, colour);
      return spare;
    },
    /** Write every car's body and wheel matrices. */
    update() {
      cars.forEach((car, carIndex) => {
        const mesh = meshes[car.type];
        // bodyHidden: the camera sits inside this one, and the cockpit stands in for it.
        if (!car.visible || car.bodyHidden) {
          mesh.setMatrixAt(car.index, hidden);
          for (let w = 0; w < 4; w += 1) wheels.setMatrixAt(carIndex * 4 + w, hidden);
          return;
        }
        euler.set(car.pitch, car.heading, car.roll);
        quaternion.setFromEuler(euler);
        matrix.compose(car.position, quaternion, unit);
        mesh.setMatrixAt(car.index, matrix);
        const spec = car.spec;
        const scale = spec.wheelRadius / WHEEL_MODEL_RADIUS;
        let w = 0;
        for (const axle of [spec.frontAxle, spec.rearAxle]) {
          for (const side of [1, -1]) {
            const steer = axle === spec.frontAxle ? car.steer : 0;
            euler.set(car.spin * side, steer + (side < 0 ? Math.PI : 0), 0, 'YXZ');
            quaternion.setFromEuler(euler);
            local.compose(new THREE.Vector3(side * spec.track, spec.wheelRadius, axle), quaternion,
              new THREE.Vector3(scale, scale, scale));
            wheelMatrix.multiplyMatrices(matrix, local);
            wheels.setMatrixAt(carIndex * 4 + w, wheelMatrix);
            w += 1;
          }
        }
      });
      for (const type of TYPE_NAMES) meshes[type].instanceMatrix.needsUpdate = true;
      wheels.instanceMatrix.needsUpdate = true;
    },
  };
}
