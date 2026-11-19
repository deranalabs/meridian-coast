// Car pose from a driving state: sits the body on the ground, pitches it to the slope and rolls it into slides.

/** Copy vehicle state `v` onto fleet car `car`; `heightAt(x, z)` gives the ground height. */
export function poseCar(car, v, heightAt, dt) {
  const fx = Math.sin(v.heading) * 1.4;
  const fz = Math.cos(v.heading) * 1.4;
  const front = heightAt(v.x + fx, v.z + fz);
  const back = heightAt(v.x - fx, v.z - fz);
  car.position.set(v.x, (front + back) / 2, v.z);
  car.heading = v.heading;
  car.pitch = -Math.atan2(front - back, 2.8);
  const roll = Math.max(-0.07, Math.min(0.07, v.lateral * -0.012));
  car.roll += (roll - car.roll) * Math.min(1, dt * 6);
  car.steer = v.steer;
  car.spin = v.spin;
}
