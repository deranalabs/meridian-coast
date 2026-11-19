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
    skyZenith: '#1c1a4e',
    skyMid: '#6a3c8c',
    skyHorizon: '#ff9468',
    sunGlow: '#ffc08a',
    hemiSky: '#8a74c8',
    hemiGround: '#5a3a3a',
    hemiIntensity: 0.9,
    haze: '#9a6290',
    hazeDensity: 0.0019,
    hazeFalloff: 0.03,
    exposure: 1.0,
    windowsLit: 0.34,
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
    hemiSky: '#3a3a78',
    hemiGround: '#2a1a2a',
    hemiIntensity: 0.55,
    haze: '#2e2146',
    hazeDensity: 0.0026,
    hazeFalloff: 0.032,
    exposure: 1.15,
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
