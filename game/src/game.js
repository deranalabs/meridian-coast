// Game assembly: builds the world, actors, vehicles, cameras and HUD, and runs one fixed step and one draw.
import * as THREE from '../vendor/three.module.min.js';
import { isSearching } from './police/wanted.js';
import { policeReport } from './police/report.js';
import { createPlayer } from './actors/player.js';
import { createStory } from './missions/setup.js';
import { createAction } from './systems/action.js';
import { createServices } from './systems/services.js';
import { baseOutfit } from './shops/outfit.js';
import { ammoView } from './combat/arsenal.js';
import { createFleet } from './vehicles/fleet.js';
import { createTraffic } from './vehicles/traffic.js';
import { createSmoke } from './vehicles/smoke.js';
import { createChaseCamera, createFootCamera } from './vehicles/camera.js';
import { createCharacters } from './actors/characters.js';
import { createPedestrians } from './actors/pedestrians.js';
import { iloAppearance } from './actors/appearance.js';
import { CAR_PAINTS } from './palette.js';
import { createHud } from './ui/hud.js';
import { createRadio } from './ui/radio.js';
import { createPhone } from './ui/phone.js';
import { createMapScreen } from './ui/mapscreen.js';
import { createPost } from './render/post.js';
import { createSky } from './render/sky.js';
import { createEnvironment } from './render/environment.js';
import { createLighting } from './render/lighting.js';
import { installFog } from './render/fog.js';
import { createCity } from './world/city.js';
import { createLandmarks } from './world/landmarks.js';
import { createGround } from './world/ground.js';
import { createColliders } from './world/colliders.js';
import { edgeBand, EDGE_LINE } from './world/boundary.js';

/** The same keyboard with this step's presses hidden (the phone has them); held keys still steer a car. */
const pressFree = (input) => ({ mouse: input.mouse, down: (...codes) => input.down(...codes),
  axis: (negative, positive) => input.axis(negative, positive), pressed: () => false, consume() {}, endFrame() {} });

const PEDESTRIANS = 46;
const TRAFFIC = 26;
const PARKED = 34;
/** Room in the crowd for the story: cast members on set plus a mission crew. */
const STORY_ACTORS = 12;

function addParkedCars(fleet, parking, focus, random) {
  const spots = [...parking].sort((a, b) => Math.hypot(a.x - focus.x, a.z - focus.z)
    - Math.hypot(b.x - focus.x, b.z - focus.z)).slice(0, PARKED);
  spots.forEach((spot, index) => {
    const type = ['sedan', 'coupe', 'sedan', 'pickup'][index % 4];
    const car = fleet.add(type, CAR_PAINTS[(index * 7 + random) % CAR_PAINTS.length]);
    if (!car) return;
    car.position.set(spot.x, 0, spot.z);
    car.heading = spot.rot;
    car.parked = true;
  });
}

/** Build everything for `seed` and `timeOfDay`; focus is where ambient life spawns first. */
export function createGame({ renderer, seed, timeOfDay, focus, showHud }) {
  const scene = new THREE.Scene();
  scene.fog = installFog(timeOfDay);
  scene.environment = createEnvironment(renderer, timeOfDay);
  scene.environmentIntensity = timeOfDay.envIntensity;
  const sky = createSky(timeOfDay);
  scene.add(sky.mesh);
  const lighting = createLighting(scene, timeOfDay);
  const city = createCity(seed, timeOfDay);
  scene.add(city.group);
  const landmarks = createLandmarks(city, timeOfDay);
  scene.add(landmarks.group);

  const ground = createGround(city.layout, city.buildings.colliders);
  const colliders = createColliders();
  for (const box of city.buildings.colliders) colliders.addBox(box);
  for (const shape of landmarks.colliders) {
    if (shape.r) colliders.addCircle(shape);
    else colliders.addBox(shape);
  }

  const fleet = createFleet(40, city.surfaces.data, timeOfDay);
  scene.add(fleet.group);
  addParkedCars(fleet, city.props.parking, focus, seed);
  for (const car of fleet.cars) car.position.y = ground.surfaceAt(car.position.x, car.position.z).height;
  const traffic = createTraffic(fleet, city.layout, ground, TRAFFIC, seed, focus);
  const smoke = createSmoke(400, timeOfDay);
  scene.add(smoke.points);

  const characters = createCharacters(PEDESTRIANS + 20 + STORY_ACTORS, city.surfaces.data);
  scene.add(characters.mesh);
  const ilo = characters.add(iloAppearance());
  ilo.position.set(focus.x, ground.surfaceAt(focus.x, focus.z).height, focus.z);
  const pedestrians = createPedestrians(characters, city.layout, PEDESTRIANS, seed, focus);
  const playerHooks = {};
  const player = createPlayer(ilo, { fleet, colliders, ground, smoke, traffic }, playerHooks);

  const camera = new THREE.PerspectiveCamera(58, 16 / 10, 0.1, 2600);
  const chase = createChaseCamera(camera);
  const footCamera = createFootCamera(camera);
  const post = createPost(renderer, timeOfDay);
  const hud = createHud(city.layout, showHud);
  const radio = createRadio(0);
  const focusPoint = new THREE.Vector3();
  const lookPoint = new THREE.Vector3();

  const game = {
    scene, camera, city, landmarks, ground, colliders, fleet, traffic, smoke, characters, ilo, pedestrians, player,
    chase, footCamera, post, hud, radio, lighting, sky, timeOfDay, seed, time: 0, cameraMode: 'auto',
    chaseOptions: undefined, playerHooks,
  };
  game.action = createAction(game);
  game.baseLook = ilo.appearance;
  game.outfit = baseOutfit(ilo.appearance);
  game.ownedCars = [];
  game.services = createServices(game);
  game.missions = createStory(game);
  game.phone = createPhone(game);
  // The radio hears the city: jobs passed and failed, chases, the helicopter, arrests become news flashes.
  radio.listen(game.action.events);
  game.prompt = null;
  let heldInput = null;

  game.step = (dt, rawInput) => {
    game.time += dt;
    const phoneKeys = !game.services.shops.openPlace && game.phone.update(rawInput);
    const input = phoneKeys ? (heldInput ??= pressFree(rawInput)) : rawInput;
    game.prompt = game.services.update(dt, input);
    const missionPrompt = game.services.respawn.active ? null : game.missions.update(dt, input);
    game.prompt ??= missionPrompt;
    game.dialogue.update(dt, input);
    const event = player.update(dt, input, footCamera.state.yaw);
    if (event?.entered) chase.snap();
    if (input.pressed('KeyR') && player.state.mode === 'driving') radio.next();
    game.action.update(dt, input, game.time);
    const subject = player.state.car ? player.state.car.position : ilo.position;
    focusPoint.copy(subject);
    traffic.update(dt, focusPoint, [subject]);
    pedestrians.update(dt, focusPoint);
    smoke.update(dt);
    characters.update(dt, game.time);
    fleet.update();
    radio.update(dt);
    city.update(game.time);
    landmarks.update(game.time);
    if (game.cameraMode === 'auto') game.updateCamera(dt, input.mouse);
  };

  game.updateCamera = (dt, mouse = { dx: 0, dy: 0 }) => {
    if (player.state.mode === 'driving') {
      chase.update(player.state.car, player.state.vehicle.speed, dt, game.chaseOptions);
      footCamera.setYaw(player.state.car.heading);
    } else {
      footCamera.update(ilo.position, mouse, dt, (x, z) => ground.surfaceAt(x, z).height);
    }
  };

  game.nearCarHint = () => {
    const at = player.state.car?.position ?? ilo.position;
    if (edgeBand(at.x, at.z)) return EDGE_LINE;
    if (game.prompt) return game.prompt;
    if (player.state.mode !== 'foot' || player.state.down || player.state.frozen) return null;
    for (const car of fleet.cars) {
      if (car.visible && car.position.distanceTo(ilo.position) < 4) return 'Press <kbd>E</kbd> to take the car';
    }
    return null;
  };

  game.draw = (time) => {
    camera.getWorldDirection(lookPoint).multiplyScalar(30).add(camera.position);
    city.cull(camera.position);
    lighting.follow(lookPoint);
    lighting.lightSubject(ilo.position, camera);
    sky.update(camera, time);
    game.action.draw(time);
    post.render(scene, camera, time);
  };

  /** The slot under the mission panel: with no job running, where jobs are; while wanted, how to lose the heat. */
  game.objective = () => {
    const wanted = game.action.police.wanted;
    if (wanted.stars === 0) {
      const open = game.missions.available();
      // Name the next story job when there is one; repeatable activities only fill in after the story.
      const next = open.find((def) => !def.activity) ?? open[0];
      return { label: 'NO MISSION', text: next ? `Free roam: <b>${next.title}</b> waits at the gold pin`
        + '<small>Press <kbd>E</kbd> at the gold pillar, or <kbd>P</kbd> for the phone</small>'
        : 'Free roam: no calls right now<small>Coloured markers on the map are shops</small>' };
    }
    return isSearching(wanted)
      ? { label: 'HEAT', text: 'Stay out of sight to lose a star' }
      : { label: 'HEAT', text: 'Lose the police: break their line of sight or hit a <b>spray bay</b>' };
  };

  game.updateHud = () => {
    const driving = player.state.mode === 'driving';
    const subject = driving ? player.state.car.position : ilo.position;
    const heading = driving ? player.state.car.heading : footCamera.state.yaw;
    hud.update({
      cash: player.state.wallet.cash,
      health: player.state.vitals.health,
      armour: player.state.vitals.armour,
      respect: game.missions.progress?.respect ?? 0,
      stars: game.action.police.wanted.stars,
      searching: isSearching(game.action.police.wanted),
      weapon: ammoView(player.state.arsenal),
      arsenal: player.state.arsenal,
      menu: Boolean(game.services.shops.openPlace),
      police: () => policeReport(game.action.police, subject.x, subject.z),
      objective: game.objective(),
      mission: game.missions.hudView(),
      route: game.missions.route,
      speed: driving ? player.state.vehicle.speed : 0,
      driving,
      car: driving ? player.state.car : null,
      x: subject.x,
      z: subject.z,
      heading,
      radio: radio.line(),
      blips: game.blips(),
      hint: game.nearCarHint(),
    });
  };

  /** Everything the minimap and the full map mark: landmarks, shops, jobs and their targets, police. */
  game.blips = () => [...landmarks.blips, ...game.services.blips, ...game.missions.blips,
    ...game.action.police.blips(game.time)];

  /** What the full map shows: where Ilo is and faces, every blip and the job route. */
  game.mapView = () => {
    const driving = player.state.mode === 'driving';
    const subject = driving ? player.state.car.position : ilo.position;
    return { x: subject.x, z: subject.z, heading: driving ? player.state.car.heading : footCamera.state.yaw,
      blips: game.blips(), route: game.missions.route };
  };
  game.map = createMapScreen(game);

  return game;
}
