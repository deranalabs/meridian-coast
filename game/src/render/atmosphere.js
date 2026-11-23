// The live atmosphere: writes a look, and the rain on it, into the sky, lights, haze, sea, lamps and wet ground.
import * as THREE from '../../vendor/three.module.min.js';
import { rainLook } from './rainlook.js';
import { createRain } from './rain.js';
import { setFogSun } from './fog.js';

/** Sky uniform → the look's colour. */
const SKY_COLOURS = { uZenith: 'skyZenith', uMid: 'skyMid', uHorizon: 'skyHorizon', uHaze: 'haze',
  uSunColor: 'sunColor', uSunGlow: 'sunGlow', uCloudLight: 'cloudLight' };
/** world/signs.js lights neon at this many times the look's neon level. */
const NEON_GAIN = 3.4;
/** Tail lamps and signals still show by day. */
const CAR_LAMPS_LEAST = 0.3;
const PROP_GLOW_LEAST = 0.08;
const BEAM = new THREE.Color('#fff0c0');

/** Every material under `roots` once. */
function materialsUnder(...roots) {
  const found = new Set();
  for (const root of roots) {
    root.traverse((object) => {
      if (object.material && !Array.isArray(object.material)) found.add(object.material);
    });
  }
  return [...found];
}

/** The parts a look is written to, found once when the game is built. */
function findTargets({ city, landmarks, fleet }) {
  const material = (root, name) => root.getObjectByName(name).material;
  const own = (list, name) => list.map((entry) => entry.userData.uniforms?.[name]).filter(Boolean);
  const pools = materialsUnder(city.group.getObjectByName('light-pools'));
  return {
    wet: [material(city.group, 'terrain'), material(city.group, 'sidewalks')],
    facade: material(city.group, 'buildings').userData.uniforms,
    water: material(city.group, 'water'),
    neon: material(city.group, 'neon-signs').uniforms.uLevel,
    boards: material(city.group, 'billboards'),
    glows: material(city.group, 'glow-pools').uniforms.uLevel,
    beam: material(landmarks.group, 'lighthouse-beam').uniforms.uColour.value,
    props: own(materialsUnder(city.group, landmarks.group), 'uGlowLevel'),
    cars: own(materialsUnder(fleet.group), 'uLampLevel'),
    // The pools and halos under the lamps keep their built colour, scaled by how far the lamps are up.
    lampLight: pools.filter((entry) => entry.uniforms?.uColour)
      .map(({ uniforms }) => ({ colour: uniforms.uColour.value, built: uniforms.uColour.value.clone() })),
  };
}

/**
 * For a built game. apply(look, rain) writes only when asked, so a pinned dry scene keeps exactly the values its
 * modules were built with; draw(camera, time, amount) moves the streaks. Neither allocates after the first call.
 */
export function createAtmosphere(game) {
  const { scene, sky, lighting, post, timeOfDay } = game;
  const rain = createRain();
  scene.add(rain.mesh);
  const targets = findTargets(game);
  const skyUniforms = sky.mesh.material.uniforms;
  const composite = post.composite.uniforms;
  const builtLamps = timeOfDay.lampLevel;
  // The shadow box follows timeOfDay.sunDir; its own copy here leaves the shared preset alone.
  timeOfDay.sunDir = timeOfDay.sunDir.clone();
  const shown = {};
  let wetShaders = false;

  /** The first rain swaps in the wet programs; until then the ground runs the dry ones, unchanged. */
  function wetGround(amount) {
    if (amount > 0 && !wetShaders) {
      wetShaders = true;
      for (const material of targets.wet) {
        (material.defines ??= {}).WET_RAIN = '';
        material.needsUpdate = true;
      }
    }
    const [terrain, pavement] = targets.wet;
    terrain.userData.uniforms.uWetness.value = shown.groundWet;
    pavement.userData.uniforms.uWetness.value = shown.paveWet;
    for (const material of targets.wet) material.userData.uniforms.uRain.value = amount;
  }

  function showSky() {
    for (const name in SKY_COLOURS) skyUniforms[name].value.copy(shown[SKY_COLOURS[name]]);
    skyUniforms.uSunDir.value.copy(shown.sunDir);
    skyUniforms.uStars.value = shown.stars;
    scene.fog.color.copy(shown.haze);
    scene.fog.density = shown.hazeDensity;
    setFogSun(shown.sunDir, shown.sunGlow);
    targets.water.color.copy(shown.waterColor);
  }

  function showLights() {
    timeOfDay.sunDir.copy(shown.sunDir);
    scene.environmentIntensity = shown.envIntensity;
    lighting.sun.color.copy(shown.sunColor);
    lighting.sun.intensity = shown.sunIntensity;
    lighting.hemi.color.copy(shown.hemiSky);
    lighting.hemi.groundColor.copy(shown.hemiGround);
    lighting.hemi.intensity = shown.hemiIntensity;
    lighting.key.color.copy(shown.keyColour);
    lighting.key.intensity = shown.keyLight;
    lighting.rim.color.copy(shown.rimColour);
    lighting.rim.intensity = shown.rimLight;
    lighting.rim.position.set(-shown.sunDir.x, 0.5, -shown.sunDir.z).multiplyScalar(100);
  }

  function showLamps() {
    const level = shown.lampLevel;
    for (const uniform of targets.props) uniform.value = Math.max(PROP_GLOW_LEAST, level);
    for (const uniform of targets.cars) uniform.value = Math.max(CAR_LAMPS_LEAST, level);
    const scale = builtLamps > 0 ? level / builtLamps : 0;
    for (const { colour, built } of targets.lampLight) colour.copy(built).multiplyScalar(scale);
    targets.facade.uWindowsLit.value = shown.windowsLit;
    targets.facade.uWindowLevel.value = shown.windowGlow;
    targets.neon.value = NEON_GAIN * shown.neonLevel;
    targets.boards.emissiveIntensity = shown.boards;
    targets.glows.value = shown.glows;
    targets.beam.copy(BEAM).multiplyScalar(shown.beam);
    game.glowSprites?.levels(shown.neonLevel, shown.windowsLit, level);
  }

  function showGrade() {
    composite.uExposure.value = shown.exposure;
    composite.uBloomStrength.value = shown.bloomStrength;
    composite.uSaturation.value = shown.saturation;
    composite.uVignette.value = shown.vignette;
    composite.uShadowTint.value.set(shown.shadowTint.r, shown.shadowTint.g, shown.shadowTint.b);
  }

  function apply(look, amount) {
    rainLook(look, amount, shown);
    showSky();
    showLights();
    showLamps();
    showGrade();
    wetGround(amount);
  }

  return { apply, rain, draw: (camera, time, amount) => rain.update(camera, time, amount) };
}
