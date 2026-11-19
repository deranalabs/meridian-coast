// Mission kit: spawns what a mission stage needs (cast actors, tagged cars that take damage, convoys, crews)
// into a scope that is cleaned up in one call when the stage restarts or the mission ends.
import { castMember } from '../data/cast.js';
import { castAppearance } from '../actors/castlook.js';
import { pointOf } from './resolve.js';
import { createConvoy } from './convoy.js';
import { createCrew } from './crew.js';
import { createCourse } from './course.js';
import { createVaultDoor } from './vaultdoor.js';

const WALL_SAFE = 3.5;
const WALL_HURT = 7;
const RAM_HURT = 3;
const SHOT_HURT = 6;

/** The kit over `game`; `places` maps place ids to resolved places. scope() starts a fresh set of props. */
export function createMissionKit(game, places) {
  const actors = new Map();
  const { fleet, ground, characters, player } = game;
  const events = game.action.events;
  let live = null;

  events.on('car-shot', (e) => live?.hurtCar(e.car, SHOT_HURT));
  events.on('crash', (e) => {
    if (e.player && player.state.car) live?.hurtCar(player.state.car, e.speed * RAM_HURT);
  });

  function actor(id, at, { heading = null, clip = 'idle', offset = 1.2 } = {}) {
    const person = castMember(id);
    if (!person) throw new Error(`Unknown cast member: ${id}`);
    let character = actors.get(id);
    if (!character) {
      character = characters.add(castAppearance(person));
      actors.set(id, character);
    }
    const point = pointOf(at, places);
    const place = typeof at === 'string' ? places.get(at) : null;
    const x = point.x + (place?.outX ?? 0) * offset;
    const z = point.z + (place?.outZ ?? 0) * offset;
    character.visible = true;
    character.position.set(x, ground.surfaceAt(x, z).height, z);
    character.heading = heading ?? (place ? Math.atan2(place.outX, place.outZ) : 0);
    character.play(clip);
    return character;
  }

  function scope() {
    const own = { actors: [], cars: [], convoys: [], crews: [], courses: [] };
    const props = {
      cars: {}, targets: {}, enemies: {}, blips: [], focus: null,
      /** Place a cast member at a place id or point; the first one placed is the cutscene focus. */
      actor(id, at, options) {
        const character = actor(id, at, options);
        own.actors.push(character);
        props.focus ??= character.position;
        return character;
      },
      /** A parked car tagged for the mission; it takes damage from walls, rams and bullets. */
      car(tag, type, colour, at, heading = null) {
        const point = pointOf(at, places);
        const car = fleet.reuse(type, colour);
        car.position.set(point.x, ground.surfaceAt(point.x, point.z).height, point.z);
        car.heading = heading ?? point.heading ?? 0;
        car.parked = true;
        car.missionTag = tag;
        own.cars.push(car);
        props.cars[tag] = { car, x: point.x, z: point.z, health: 100 };
        return car;
      },
      /** A vehicle that drives a road route; it shows as a target named `name`. */
      convoy(name, options) {
        const convoy = createConvoy(game, { ...options, from: pointOf(options.from, places),
          to: pointOf(options.to, places) });
        own.convoys.push(convoy);
        props.targets[name] = convoy.target;
        return convoy;
      },
      /** A race course of gates over the roads; its current gate shows as target `name`, with any rival car. */
      course(name, options) {
        const course = createCourse(game, { onGate: (gate, gates) => events.emit('ui', { kind: gate >= gates
          ? 'buy' : 'move' }), ...options, from: pointOf(options.from, places), to: pointOf(options.to, places) });
        own.courses.push(course);
        props.targets[name] = course.target;
        return course;
      },
      /**
       * A vault door set `back` metres into the wall behind a place; the lance cuts it in `seconds` while Ilo
       * stands at it. It steps and goes away with the courses (anything with update(dt, view) and dispose()).
       */
      vaultDoor(at, { seconds = 30, back = 1.6, reach = 6 } = {}) {
        const place = typeof at === 'string' ? places.get(at) : null;
        const point = pointOf(at, places);
        const outX = place?.outX ?? 0;
        const outZ = place?.outZ ?? 1;
        const x = point.x - outX * back;
        const z = point.z - outZ * back;
        const door = createVaultDoor(game.action.effects, { x, y: ground.surfaceAt(x, z).height, z }, outX, outZ,
          { reach: reach + back });
        game.scene.add(door.group);
        own.courses.push({ update: (dt, view) => door.update(dt, view, seconds), dispose: door.dispose });
        return door;
      },
      /** Armed people of a group; enemies[group] counts those still standing. */
      crew(group, spots, options = {}) {
        const crew = createCrew(game, group, spots.map((spot) => pointOf(spot, places)), options);
        own.crews.push(crew);
        props.enemies[group] = crew.standing;
        return crew;
      },
      hurtCar(car, amount) {
        const entry = Object.values(props.cars).find((item) => item.car === car);
        if (entry) entry.health = Math.max(0, entry.health - amount);
      },
      update(dt, view) {
        const p = player.state;
        for (const entry of Object.values(props.cars)) {
          entry.x = entry.car.position.x;
          entry.z = entry.car.position.z;
          if (p.car === entry.car && p.vehicle.impact > WALL_SAFE) {
            entry.health = Math.max(0, entry.health - (p.vehicle.impact - WALL_SAFE) * WALL_HURT);
          }
        }
        for (const convoy of own.convoys) convoy.update(dt, view);
        for (const course of own.courses) course.update(dt, view);
        for (const crew of own.crews) {
          crew.update(dt, view);
          props.enemies[crew.group] = crew.standing;
        }
        props.blips.length = 0;
        for (const crew of own.crews) crew.addBlips(props.blips);
        for (const course of own.courses) {
          const car = course.rival?.car;
          if (car) props.blips.push({ x: car.position.x, z: car.position.z, enemy: true, colour: '#ff8a3d' });
        }
      },
      dispose() {
        for (const character of own.actors) character.visible = false;
        for (const car of own.cars) {
          car.missionTag = null;
          if (player.state.car === car) continue;
          car.visible = false;
          car.spare = true;
        }
        for (const convoy of own.convoys) convoy.dispose();
        for (const course of own.courses) course.dispose();
        for (const crew of own.crews) crew.dispose();
        if (live === props) live = null;
      },
    };
    live = props;
    return props;
  }

  return { scope, actor, point: (at) => pointOf(at, places), places };
}
