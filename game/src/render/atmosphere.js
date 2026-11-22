// The live atmosphere: writes a look, and the rain on it, into the sky, lights, haze and wet ground it is shown on.
import { rainLook } from './rainlook.js';
import { createRain } from './rain.js';

/** Sky uniform → the look's colour. */
const SKY_COLOURS = { uZenith: 'skyZenith', uMid: 'skyMid', uHorizon: 'skyHorizon', uHaze: 'haze',
  uSunColor: 'sunColor', uSunGlow: 'sunGlow', uCloudLight: 'cloudLight' };

/**
 * For a built game {scene, sky, lighting, city}. apply(look, rain) writes only when asked, so a pinned dry scene
 * keeps exactly the values its modules were built with; draw(camera, time, amount) moves the streaks.
 */
export function createAtmosphere({ scene, sky, lighting, city }) {
  const rain = createRain();
  scene.add(rain.mesh);
  const wet = ['terrain', 'sidewalks'].map((name) => city.group.getObjectByName(name).material);
  const skyUniforms = sky.mesh.material.uniforms;
  const shown = {};
  let wetShaders = false;

  /** The first rain swaps in the wet programs; until then the ground runs the dry ones, unchanged. */
  function wetGround(amount) {
    if (amount > 0 && !wetShaders) {
      wetShaders = true;
      for (const material of wet) {
        (material.defines ??= {}).WET_RAIN = '';
        material.needsUpdate = true;
      }
    }
    for (const material of wet) material.userData.uniforms.uRain.value = amount;
  }

  function apply(look, amount) {
    rainLook(look, amount, shown);
    for (const name in SKY_COLOURS) skyUniforms[name].value.copy(shown[SKY_COLOURS[name]]);
    skyUniforms.uStars.value = shown.stars;
    scene.fog.color.copy(shown.haze);
    scene.fog.density = shown.hazeDensity;
    scene.environmentIntensity = shown.envIntensity;
    lighting.sun.color.copy(shown.sunColor);
    lighting.sun.intensity = shown.sunIntensity;
    lighting.hemi.color.copy(shown.hemiSky);
    lighting.hemi.groundColor.copy(shown.hemiGround);
    lighting.hemi.intensity = shown.hemiIntensity;
    wetGround(amount);
  }

  return { apply, rain, draw: (camera, time, amount) => rain.update(camera, time, amount) };
}
