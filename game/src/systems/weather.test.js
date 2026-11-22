// Tests for rain: T turns it on and off, the streaks never pass 400, and every staged dry scene stays dry.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../vendor/three.module.min.js';
import { createWeather, startingWeather } from './weather.js';
import { createRain, MAX_STREAKS, streakCount } from '../render/rain.js';
import { rainLook } from '../render/rainlook.js';
import { getTimeOfDay } from '../render/timeofday.js';
import { SHOTS, getShot } from '../shots.js';
import { SHOT_LIST } from '../../../tests/shot-list.mjs';

const settle = (weather) => {
  for (let step = 0; step < 600; step += 1) weather.update(1 / 60);
};

test('a toggle brings the rain and the next one stops it by itself', () => {
  const weather = createWeather();
  assert.equal(weather.amount, 0);
  assert.equal(weather.toggle(), 'rain');
  weather.update(1 / 60);
  assert.ok(weather.amount > 0 && weather.amount < 0.1, 'it eases in');
  settle(weather);
  assert.equal(weather.amount, 1);
  assert.equal(weather.toggle(), 'clear');
  settle(weather);
  assert.equal(weather.amount, 0);
});

test('the address starts rain at once and anything else starts dry', () => {
  assert.equal(createWeather(startingWeather(null, 'rain')).amount, 1);
  for (const asked of [null, '', 'snow']) assert.equal(createWeather(startingWeather(null, asked)).amount, 0);
});

test('the cover and the sheet never rain, whatever the address or the T key says', () => {
  for (const { name } of SHOT_LIST) {
    const weather = createWeather(startingWeather(getShot(name), 'rain'));
    assert.equal(weather.amount, 0, name);
    assert.equal(weather.toggle(), null, `${name} ignores T`);
    settle(weather);
    assert.equal(weather.amount, 0, name);
  }
});

test('one staged scene rains and it is not on the sheet', () => {
  assert.equal(createWeather(startingWeather(SHOTS.rain, null)).amount, 1);
  assert.ok(!SHOT_LIST.some(({ name }) => name === 'rain'));
});

test('the streak count never passes 400', () => {
  assert.ok(MAX_STREAKS <= 400);
  const rain = createRain();
  const camera = new THREE.PerspectiveCamera();
  for (const amount of [-1, 0, 0.01, 0.5, 1, 4, Infinity, NaN]) {
    const count = streakCount(amount);
    assert.ok(count >= 0 && count <= 400, `${amount} gave ${count}`);
    rain.update(camera, 3, amount);
    assert.equal(rain.mesh.geometry.instanceCount, count);
    assert.equal(rain.mesh.visible, count > 0);
  }
});

test('a frame of rain reuses its buffers and its uniform objects', () => {
  const rain = createRain();
  const camera = new THREE.PerspectiveCamera();
  rain.update(camera, 1, 1);
  const { uCentre, uTime } = rain.mesh.material.uniforms;
  const centre = uCentre.value;
  const seeds = rain.mesh.geometry.attributes.aSeed.array;
  camera.position.set(90, 4, -30);
  rain.update(camera, 2, 1);
  assert.equal(uCentre.value, centre);
  assert.equal(uTime.value, 2);
  assert.equal(rain.mesh.geometry.attributes.aSeed.array, seeds);
});

test('rain lowers the sky light and thickens the haze at any time of day', () => {
  for (const name of ['dusk', 'night', 'golden']) {
    const base = getTimeOfDay(name);
    const wet = rainLook(base, 1);
    assert.ok(wet.sunIntensity < base.sunIntensity, name);
    assert.ok(wet.hemiIntensity < base.hemiIntensity, name);
    assert.ok(wet.hazeDensity > base.hazeDensity, name);
    assert.ok(wet.stars <= base.stars, name);
    const dry = rainLook(base, 0);
    assert.ok(dry.skyMid.equals(base.skyMid), `${name} dry is the preset`);
    assert.equal(dry.hazeDensity, base.hazeDensity);
  }
});
