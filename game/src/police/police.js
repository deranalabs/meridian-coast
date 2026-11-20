// Police system: wanted level, witnesses and crimes, patrols, pursuit units, officers, roadblocks, helicopter, busts.
import * as THREE from '../../vendor/three.module.min.js';
import { createWanted, commitCrime, updateWanted, clearWanted, setStars, dispatchFor, isSearching }
  from './wanted.js';
import { createTraffic } from '../vehicles/traffic.js';
import { resolveCarContacts } from '../vehicles/carcollide.js';
import { createUnits } from './units.js';
import { createOfficers } from './officers.js';
import { createRoadblocks } from './roadblocks.js';
import { createHelicopter } from './helicopter.js';
import { createBeacons } from './beacons.js';
import { drawLightBars } from './lightbar.js';
import { createPoliceGunfire } from './gunfire.js';
import { createRandom } from '../core/random.js';

const NAVY = '#16203a';
const SIGHT = { car: 75, officer: 50, patrol: 60 };
/** Seconds before the same kind of crime can add heat again (a burst of fire is one offence). */
const CRIME_COOLDOWN = { firearmNearPolice: 6, firearm: 6, assault: 2, ramPolice: 2, hitPolice: 1.5, stealCar: 1,
  reportedCall: 8 };

export function createPolice({ fleet, layout, ground, colliders, characters, effects, events, timeOfDay, seed,
  focus, noise }) {
  const rng = createRandom(seed * 53 + 11);
  const random = () => rng.next();
  const wanted = createWanted();
  const patrol = createTraffic(fleet, layout, ground, 2, seed + 5, focus, 170, { types: ['cruiser'], paints: [NAVY] });
  for (const agent of patrol.agents) agent.car.police = true;
  const units = createUnits({ fleet, colliders, ground, graph: layout.graph, random });
  const officers = createOfficers(characters, 10, seed);
  const roadblocks = createRoadblocks(fleet, officers, ground);
  const helicopter = createHelicopter(timeOfDay, noise);
  const beacons = createBeacons(96, 16, timeOfDay.washLevel ?? 1);
  const gunfire = createPoliceGunfire({ effects, events, colliders, random });
  const group = new THREE.Group();
  group.name = 'police';
  group.add(helicopter.group, beacons.group);
  const groundAt = (x, z) => ground.surfaceAt(x, z).height;
  const push = (x, z, r) => colliders.resolveCircle(x, z, r);
  const clear = (ax, az, bx, bz) => colliders.segmentHit(ax, az, bx, bz, 2.5) >= 1;
  const lightLevel = timeOfDay.name === 'night' ? 1.3 : 0.9;
  const state = { spawnTimer: 0, bustTimer: 0, sightTimer: 0, seen: false, ramCooldown: 0, siren: Infinity, clock: 0,
    cooldowns: {} };
  const heatView = { stars: 0, seen: false, searching: false, closing: false };

  function watchers() {
    const list = [];
    for (const unit of units.units) list.push([unit.car.position, SIGHT.car]);
    for (const agent of patrol.agents) list.push([agent.car.position, SIGHT.patrol]);
    for (const officer of officers.pool) {
      if (officer.active && !officer.down) list.push([officer.character.position, SIGHT.officer]);
    }
    for (const block of roadblocks.blocks) list.push([{ x: block.x, z: block.z }, SIGHT.car]);
    return list;
  }

  function witnessed(x, z) {
    if (helicopter.lit(x, z)) return true;
    return watchers().some(([p, range]) => Math.hypot(p.x - x, p.z - z) < range && clear(p.x, p.z, x, z));
  }

  function policeWithin(x, z, radius) {
    return watchers().some(([p]) => Math.hypot(p.x - x, p.z - z) < radius);
  }

  /** A crime at (x, z): counts when police see it (or `force`). Returns whether it was witnessed. */
  function reportCrime(crime, x, z, force = false) {
    const ready = (state.cooldowns[crime] ?? -Infinity) <= state.clock;
    if (!ready) return true;
    const seen = force || witnessed(x, z);
    if (seen) state.cooldowns[crime] = state.clock + (CRIME_COOLDOWN[crime] ?? 0);
    const raised = commitCrime(wanted, crime, { witnessed: seen, x, z });
    if (raised) events.emit('wanted', { stars: wanted.stars, crime });
    return seen;
  }

  events.on('gunshot', (e) => {
    if (e.source === 'player' && policeWithin(e.x, e.z, 55)) reportCrime('firearmNearPolice', e.x, e.z, true);
  });
  events.on('hit', (e) => {
    if (e.source !== 'player') return;
    if (e.owner.kind === 'officer') {
      reportCrime(e.killed ? 'killPolice' : 'hitPolice', e.x, e.z, true);
      if (e.killed) events.emit('drop', { x: e.x, z: e.z, kind: 'officer' });
    }
    else reportCrime(e.killed ? 'killPedestrian' : 'assault', e.x, e.z);
  });
  events.on('run-over', (e) => reportCrime(e.officer ? 'hitPolice' : 'hitPedestrian', e.x, e.z, e.officer));
  events.on('reported', (e) => reportCrime('reportedCall', e.x, e.z, true));

  function deployOfficers(unit, target) {
    const car = unit.car;
    const c = Math.cos(car.heading);
    const s = Math.sin(car.heading);
    for (const side of [-1, 1]) {
      const x = car.position.x + c * side * 1.4 + s * 0.4;
      const z = car.position.z - s * side * 1.4 + c * 0.4;
      officers.deploy(x, z, Math.atan2(target.x - x, target.z - z), random() < 0.3 ? 'shotgun' : 'pistol');
    }
    unit.officersOut = true;
  }

  function contacts(player, driving) {
    const bodies = units.units.map((unit) => ({ car: unit.car, vehicle: unit.vehicle, mass: unit.mass }));
    if (driving) bodies.unshift({ car: player.state.car, vehicle: player.state.vehicle, mass: 1, player: true });
    resolveCarContacts(bodies, fleet.cars, (body, other, otherBody, speed) => {
      const involvesPlayer = body.player || otherBody?.player;
      if (involvesPlayer && other.police && speed > 5 && state.ramCooldown <= 0) {
        state.ramCooldown = 2;
        reportCrime('ramPolice', body.vehicle.x, body.vehicle.z, true);
      }
      events.emit('crash', { speed, x: body.vehicle.x, z: body.vehicle.z, player: Boolean(involvesPlayer) });
    });
    for (const body of bodies) {
      body.car.position.x = body.vehicle.x;
      body.car.position.z = body.vehicle.z;
    }
  }

  function checkBust(dt, target, player) {
    if (wanted.stars === 0 || player.state.down) {
      state.bustTimer = 0;
      return;
    }
    const near = officers.near(target.x, target.z, target.driving ? 3.5 : 1.8).length > 0;
    const boxed = units.units.some((u) => Math.hypot(u.vehicle.x - target.x, u.vehicle.z - target.z) < 7);
    const pinned = target.driving ? Math.abs(target.speed) < 1.5 && (boxed || near) : near && !player.state.aiming;
    state.bustTimer = pinned ? state.bustTimer + dt : Math.max(0, state.bustTimer - dt * 2);
    if (state.bustTimer > (target.driving ? 3 : 1.6)) {
      state.bustTimer = 0;
      events.emit('busted', { x: target.x, z: target.z });
    }
  }

  function update(dt, { player, ilo, time }) {
    const p = player.state;
    const driving = p.mode === 'driving' && Boolean(p.vehicle);
    const target = driving
      ? { x: p.vehicle.x, z: p.vehicle.z, y: p.car.position.y, heading: p.vehicle.heading, speed: p.vehicle.speed,
        driving }
      : { x: ilo.position.x, z: ilo.position.z, y: ilo.position.y, heading: ilo.heading, speed: ilo.speed, driving };
    state.ramCooldown -= dt;
    state.clock += dt;
    patrol.update(dt, target, [target]);
    if (wanted.stars > 0) {
      for (const agent of [...patrol.agents]) {
        if (Math.hypot(agent.position.x - target.x, agent.position.z - target.z) > 110) continue;
        patrol.release(agent.car);
        units.adopt(agent.car, agent.position.x, agent.position.z, agent.car.heading, true);
      }
    }
    state.sightTimer -= dt;
    if (state.sightTimer <= 0) {
      state.sightTimer = 0.25;
      state.seen = wanted.stars > 0 && witnessed(target.x, target.z);
    }
    const change = updateWanted(wanted, dt, state.seen, target.x, target.z);
    if (change) events.emit('wanted', { stars: wanted.stars, change });
    const plan = dispatchFor(wanted.stars);
    state.spawnTimer -= dt;
    const chasing = units.units.length;
    if (wanted.stars > 0 && chasing < plan.cars && state.spawnTimer <= 0) {
      units.spawn(target);
      state.spawnTimer = 2.5;
    }
    const retired = units.update(dt, target, { seen: state.seen || wanted.hiddenTime < 2, lastKnown: wanted.lastKnown,
      leave: wanted.stars === 0 });
    for (const unit of retired) {
      if (unit.fromPatrol && patrol.agents.length < 2) patrol.adopt(unit.car, target);
      else {
        unit.car.visible = false;
        unit.car.spare = true;
      }
    }
    contacts(player, driving);
    for (const unit of units.units) {
      const d = Math.hypot(unit.vehicle.x - target.x, unit.vehicle.z - target.z);
      if (unit.officersOut && target.driving && d > 35) {
        for (const officer of officers.near(unit.vehicle.x, unit.vehicle.z, 30)) officers.dismiss(officer);
        unit.officersOut = false;
      }
    }
    if (plan.officers) {
      for (const unit of units.units) {
        const d = Math.hypot(unit.vehicle.x - target.x, unit.vehicle.z - target.z);
        if (!unit.officersOut && d < 20 && Math.abs(unit.vehicle.speed) < 3 && Math.abs(target.speed) < 5) {
          deployOfficers(unit, target);
        }
      }
    }
    officers.update(dt, { target, shoot: plan.shoot, sees: clear, groundAt, push, recall: wanted.stars === 0,
      fire: (officer) => gunfire.fire(officer, target, player) });
    roadblocks.update(dt, layout.graph, target, plan.roadblocks, driving && Math.abs(target.speed) > 8);
    if (plan.helicopter && !helicopter.state.active) helicopter.arrive(target);
    if (!plan.helicopter && helicopter.state.active) helicopter.leave();
    helicopter.update(dt, target, time, ground.roofAt ?? undefined);
    checkBust(dt, target, player);
    state.siren = Infinity;
    for (const unit of units.units) {
      if (unit.car.lightsOn) state.siren = Math.min(state.siren, Math.hypot(unit.vehicle.x - target.x,
        unit.vehicle.z - target.z));
    }
  }

  return {
    group,
    wanted,
    state,
    units,
    patrol,
    officers,
    roadblocks,
    helicopter,
    reportCrime,
    update,
    /** Minimap dots for pursuing cruisers and the helicopter, flashing red and blue. */
    blips(time) {
      const colour = Math.sin(time * 12) > 0 ? '#ff2a4a' : '#3b6bff';
      const list = units.units.map((unit) => ({ x: unit.vehicle.x, z: unit.vehicle.z, colour, police: true }));
      if (helicopter.state.active) {
        list.push({ x: helicopter.state.x, z: helicopter.state.z, colour: '#ffd166', police: true, air: true });
      }
      return list;
    },
    draw(time) {
      beacons.begin();
      drawLightBars(beacons, fleet.cars, time, lightLevel);
      helicopter.light(beacons, time, lightLevel);
      beacons.end();
    },
    /** Raise the level directly (scripted scenes). */
    setStars(stars) {
      setStars(wanted, stars);
      wanted.seen = stars > 0;
    },
    /**
     * A mission raises the alarm (a stolen job car, a tripped yard): at least `stars`, the police told Ilo is
     * at (x, z). Returns whether the level rose.
     */
    alert(stars, x, z) {
      if (wanted.stars >= stars) return false;
      setStars(wanted, stars);
      wanted.seen = true;
      wanted.lastKnown = { x, z };
      wanted.lastCrime = 'mission';
      state.spawnTimer = 0;
      events.emit('wanted', { stars: wanted.stars, crime: 'mission' });
      return true;
    },
    /** The real heat a mission reads: stars, whether units see Ilo now, searching, and a bust closing in. */
    heat() {
      heatView.stars = wanted.stars;
      heatView.seen = wanted.stars > 0 && wanted.seen;
      heatView.searching = isSearching(wanted);
      heatView.closing = state.bustTimer > 0;
      return heatView;
    },
    /** Called on busted, wasted and respray: everyone stands down. */
    standDown() {
      clearWanted(wanted);
      roadblocks.clearAll();
      for (const officer of officers.pool) if (officer.active) officers.dismiss(officer);
      helicopter.leave();
    },
  };
}
