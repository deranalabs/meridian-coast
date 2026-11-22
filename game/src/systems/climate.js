// The climate system: the T key and the weather's state, shown through the atmosphere only when something changes.
import { createWeather } from './weather.js';
import { createAtmosphere } from '../render/atmosphere.js';

const WEATHER_LINES = { rain: 'Rain over Port Meridian', clear: 'The rain is stopping' };

/** game.climate: update(dt, input) each step, draw(time) each frame. `start` is weather.js's startingWeather(). */
export function createClimate(game, start) {
  const weather = createWeather(start);
  const atmosphere = createAtmosphere(game);
  let shownRain = 0;

  function show() {
    if (weather.amount === shownRain) return;
    shownRain = weather.amount;
    atmosphere.apply(game.timeOfDay, shownRain);
  }
  show();

  return {
    weather,
    update(dt, input) {
      if (input.pressed('KeyT')) {
        const state = weather.toggle();
        if (state) game.hud.say(WEATHER_LINES[state], 2);
      }
      weather.update(dt);
      show();
    },
    draw: (time) => atmosphere.draw(game.camera, time, weather.amount),
  };
}
