// Time-of-day presets: sun, sky, haze, exposure and night-light levels shared by sky, fog, lights and post.
import * as THREE from '../../vendor/three.module.min.js';

function direction(elevationDeg, azimuthDeg) {
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
}

const PRESETS = {
  dusk: {
    sunDir: direction(7, -112),
    sunColor: '#ffb27a',
    sunIntensity: 3.2,
    skyZenith: '#2a3660',
    skyMid: '#6e5a92',
    skyHorizon: '#ff9468',
    sunGlow: '#ffc08a',
    hemiSky: '#8890c0',
    hemiGround: '#5a4838',
    hemiIntensity: 0.85,
    haze: '#a06a8a',
    hazeDensity: 0.0011,
    hazeFalloff: 0.03,
    exposure: 1.3,
    windowsLit: 0.42,
    lampLevel: 1.0,
    neonLevel: 1.0,
    stars: 0.04,
    cloudLight: '#ff9aa8',
    envIntensity: 0.9,
  },
  night: {
    sunDir: direction(24, 60),
    sunColor: '#8fa2ff',
    sunIntensity: 0.32,
    skyZenith: '#04040d',
    skyMid: '#120d2c',
    skyHorizon: '#3a1f4c',
    sunGlow: '#5a4c9a',
    hemiSky: '#4a4a88',
    hemiGround: '#2e2230',
    hemiIntensity: 0.8,
    haze: '#2e2146',
    hazeDensity: 0.0026,
    hazeFalloff: 0.032,
    exposure: 1.3,
    windowsLit: 0.58,
    lampLevel: 1.35,
    neonLevel: 1.35,
    stars: 1.0,
    cloudLight: '#4b3c7a',
    envIntensity: 0.65,
  },
};

/** The named preset (dusk when unknown) with colours turned into THREE.Color in linear space. */
export function getTimeOfDay(name) {
  const source = PRESETS[name] ?? PRESETS.dusk;
  const preset = { name: PRESETS[name] ? name : 'dusk' };
  for (const [key, value] of Object.entries(source)) {
    preset[key] = typeof value === 'string' ? new THREE.Color(value) : value;
  }
  return preset;
}
