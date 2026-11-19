// Race course: gates spaced along a road route, the current gate as a moving target, and an optional rival car
// that drives the same route; used by race stages in story missions and by the street race activity.
import { routeBetween } from '../police/navigate.js';
import { createConvoy } from './convoy.js';

/** Points every `spacing` metres along a polyline, always ending on its last point. */
export function gatesAlong(route, spacing) {
  const gates = [];
  let carried = 0;
  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    let at = spacing - carried;
    while (at < length) {
      gates.push({ x: a.x + ((b.x - a.x) * at) / length, z: a.z + ((b.z - a.z) * at) / length });
      at += spacing;
    }
    carried = length - (at - spacing);
  }
  const end = route[route.length - 1];
  const last = gates[gates.length - 1];
  if (last && Math.hypot(last.x - end.x, last.z - end.z) < spacing * 0.4) gates.pop();
  gates.push({ x: end.x, z: end.z });
  return gates;
}

/**
 * A course over `game` from `from` to `to` ({x, z}). options: spacing (m between gates), radius (m to pass a
 * gate), rival ({type, colour, speed}) races the same roads; onGate(index, gates) hears each gate passed.
 */
export function createCourse(game, { from, to, spacing = 85, radius = 10, rival = null, onGate = () => {} }) {
  const route = routeBetween(game.city.layout.graph, from.x, from.z, to.x, to.z);
  const gates = gatesAlong(route, spacing);
  const target = { x: 0, y: 0, z: 0, gate: 0, gates: gates.length, arrived: false, beaten: false, lost: false };
  let racer = null;
  let started = false;

  function aim() {
    const gate = gates[Math.min(target.gate, gates.length - 1)];
    target.x = gate.x;
    target.z = gate.z;
    target.y = game.ground.surfaceAt(gate.x, gate.z).height;
  }
  aim();

  return {
    target,
    gates,
    /** Put the rival on the start line; called when the race stage begins. */
    start() {
      started = true;
      if (rival && !racer) {
        racer = createConvoy(game, { ...rival, from, to, wait: 1, slowWhenBehind: rival.slowWhenBehind ?? 70 });
      }
    },
    get rival() {
      return racer;
    },
    /** Gates count only once the race has started (a drive to the line never passes one by accident). */
    update(dt, view) {
      if (!started || target.arrived || target.beaten) return;
      racer?.update(dt, view);
      if (view.driving && Math.hypot(view.x - target.x, view.z - target.z) < radius) {
        target.gate += 1;
        onGate(target.gate, gates.length);
        if (target.gate >= gates.length) target.arrived = true;
        else aim();
      }
      if (racer?.target.arrived && !target.arrived) target.beaten = true;
    },
    dispose() {
      racer?.dispose();
      racer = null;
    },
  };
}
