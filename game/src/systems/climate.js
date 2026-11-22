// The climate system: the weather and the day's clock, shown through the atmosphere only when one of them moves.
import { createWeather } from './weather.js';
import { createDayClock, clockText } from './dayclock.js';
import { createAtmosphere } from '../render/atmosphere.js';
import { createDayBlend, lookFor } from '../render/daycycle.js';

const WEATHER_LINES = { rain: 'Rain over Port Meridian', clear: 'The rain is stopping' };

/**
 * game.climate: update(dt, input) each step, draw(time) each frame. `weatherStart` is weather.js's
 * startingWeather() and `clockStart` dayclock.js's startingClock(). A pinned, dry game is never written to.
 */
export function createClimate(game, weatherStart, clockStart) {
  const weather = createWeather(weatherStart);
  const clock = createDayClock(clockStart);
  const pinned = lookFor(game.timeOfDay);
  const atmosphere = createAtmosphere(game);
  const blend = clock.cycles ? createDayBlend() : null;
  let shownRain = 0;
  let shownHour = clock.cycles ? -1 : clock.hour;

  function show() {
    if (weather.amount === shownRain && clock.hour === shownHour) return;
    shownRain = weather.amount;
    shownHour = clock.hour;
    atmosphere.apply(blend ? blend.at(shownHour) : pinned, shownRain);
  }
  show();

  return {
    weather,
    clock,
    /** The time on the pause screen and the phone. */
    text: () => clockText(clock.hour),
    /** A load's hour. */
    setHour(hour) {
      clock.setHour(hour);
      show();
    },
    update(dt, input) {
      if (input.pressed('KeyT')) {
        const state = weather.toggle();
        if (state) game.hud.say(WEATHER_LINES[state], 2);
      }
      weather.update(dt);
      // Free roam only: a job keeps the light it began in.
      clock.advance(dt, Boolean(game.missions.active));
      show();
    },
    draw: (time) => atmosphere.draw(game.camera, time, weather.amount),
  };
}
