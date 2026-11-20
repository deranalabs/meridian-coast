// Street life for the cover: oncoming and fleeing traffic on Shoreline Parade and a crowd on the boardwalk and kerb.
import { BEACH_ROAD_X } from './world/heightfield.js';

const PAINTS = ['#ffd23f', '#2ec4b6', '#e63946', '#f4f1ea', '#3a86ff', '#ff9f1c', '#9b5de5', '#06d6a0'];

// [x offset from the road centre, z offset from where the van ends, type, heading]: southbound cars come toward
// the camera in the far lane, northbound ones pull away ahead of the chase.
const CARS = [
  [-3, -30, 'sedan', 0], [-3, -47, 'coupe', 0], [-3.2, -66, 'pickup', 0], [-2.8, -90, 'sedan', 0],
  [-3, -112, 'coupe', 0], [3, -44, 'coupe', Math.PI], [3.2, -64, 'sedan', Math.PI], [2.9, -95, 'pickup', Math.PI],
];

// [x offset, z offset, reaction]: people on the boardwalk and sand turn to film the chase or run up the beach;
// a few on the hotel kerb do the same. Nobody stands within 6 m of the van's lane near the camera.
const CROWD = [
  [10, -4, 'film'], [11.5, -8, 'film'], [13.5, -6, 'flee'], [10.5, -15, 'film'], [15, -13, 'cower'],
  [17, -10, 'film'], [12, -22, 'flee'], [19, -19, 'film'], [14, -28, 'film'], [10, -32, 'flee'],
  [21, -26, 'film'], [16.5, -37, 'flee'], [11, -42, 'film'], [-8, -16, 'film'], [-8.5, -24, 'flee'],
  [-7.5, -31, 'film'], [-9, -40, 'flee'], [-8, -50, 'film'],
];

/** Adds the traffic and the crowd around where the van will be at the capture, (vanX, endZ). */
export function fillShoreline(game, vanX, endZ) {
  CARS.forEach(([dx, dz, type, heading], index) => {
    const car = game.fleet.add(type, PAINTS[index % PAINTS.length]);
    if (!car) return;
    car.position.set(BEACH_ROAD_X + dx, 0, endZ + dz);
    car.heading = heading;
    car.parked = true;
  });
  CROWD.forEach(([dx, dz, kind], index) => {
    const ped = game.pedestrians.peds[index];
    if (!ped) return;
    const x = BEACH_ROAD_X + dx;
    const z = endZ + dz;
    ped.character.position.set(x, game.ground.surfaceAt(x, z).height, z);
    // Filmers face the van; runners head up the beach (or up the kerb) away from the road.
    const away = dx > 0 ? -0.6 : 0.6;
    const angle = kind === 'film' ? Math.atan2(vanX - x, endZ - z) : Math.PI + away;
    ped.react = { state: kind, timer: 9, dirX: Math.sin(angle), dirZ: Math.cos(angle), fromX: vanX, fromZ: endZ };
    ped.character.held = kind === 'film' ? 'phone' : null;
  });
}
