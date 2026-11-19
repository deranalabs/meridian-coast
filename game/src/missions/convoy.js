// Convoy: a mission vehicle that drives a road route in its lane at a steady pace, easing for corners and for
// a tail that falls behind; it reports where it is and when it has arrived, for "follow" stages.
import { routeBetween } from '../police/navigate.js';

const LANE = 2.6;
const WHEEL = 0.36;

/** Point i of the route pushed into the right-hand lane. */
function laneRoute(points) {
  return points.map((point, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const shift = i === points.length - 1 ? 0 : LANE / length;
    return { x: point.x - (b.z - a.z) * shift, z: point.z + (b.x - a.x) * shift };
  });
}

/**
 * A convoy over `game` from `from` to `to` ({x, z}). options: type, colour, speed (m/s), wait (s before moving),
 * slowWhenBehind (metres; it eases off while the player is further back than this).
 */
export function createConvoy(game, { type = 'pickup', colour = '#f2f2f2', from, to, speed = 11, wait = 0,
  slowWhenBehind = 55 }) {
  const route = laneRoute(routeBetween(game.city.layout.graph, from.x, from.z, to.x, to.z));
  const car = game.fleet.reuse(type, colour);
  car.parked = false;
  car.convoy = true;
  const target = { x: route[0].x, z: route[0].z, arrived: false, lost: false, speed: 0 };
  const state = { leg: 1, pace: 0, wait };

  function place(x, z, heading) {
    car.position.set(x, game.ground.surfaceAt(x, z).height, z);
    car.heading = heading;
    target.x = x;
    target.z = z;
  }
  const first = route[1] ?? route[0];
  place(route[0].x, route[0].z, Math.atan2(first.x - route[0].x, first.z - route[0].z));

  return {
    car,
    target,
    route,
    update(dt, view) {
      if (target.arrived || game.player.state.car === car) return;
      state.wait -= dt;
      if (state.wait > 0) return;
      const behind = view ? Math.hypot(view.x - target.x, view.z - target.z) : 0;
      const a = route[state.leg - 1];
      const b = route[state.leg];
      const c = route[state.leg + 1];
      let wanted = speed * (behind > slowWhenBehind ? 0.45 : 1);
      const toCorner = Math.hypot(b.x - target.x, b.z - target.z);
      if (c && toCorner < 14) {
        const turn = Math.abs(Math.atan2(c.x - b.x, c.z - b.z) - Math.atan2(b.x - a.x, b.z - a.z)) % (Math.PI * 2);
        if (Math.min(turn, Math.PI * 2 - turn) > 0.5) wanted = Math.min(wanted, 6);
      }
      state.pace += Math.max(-8 * dt, Math.min(3 * dt, wanted - state.pace));
      let step = state.pace * dt;
      let x = target.x;
      let z = target.z;
      while (step > 0 && state.leg < route.length) {
        const end = route[state.leg];
        const left = Math.hypot(end.x - x, end.z - z);
        if (left > step) {
          x += ((end.x - x) / left) * step;
          z += ((end.z - z) / left) * step;
          step = 0;
        } else {
          x = end.x;
          z = end.z;
          step -= left;
          state.leg += 1;
        }
      }
      const heading = Math.atan2(x - target.x, z - target.z);
      const turnRate = 4 * dt;
      let delta = heading - car.heading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      place(x, z, x === target.x && z === target.z ? car.heading : car.heading + Math.max(-turnRate,
        Math.min(turnRate, delta)));
      car.spin += (state.pace * dt) / WHEEL;
      target.speed = state.pace;
      if (state.leg >= route.length) {
        target.arrived = true;
        target.speed = 0;
      }
    },
    dispose() {
      car.convoy = false;
      if (game.player.state.car === car) return;
      car.visible = false;
      car.spare = true;
    },
  };
}
