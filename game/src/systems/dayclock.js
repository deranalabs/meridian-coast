// The day's clock: a whole day in twelve minutes of free roam, held during a job, and still where a time is pinned.

export const DAY_SECONDS = 720;
/** The hour each named time stands at; a new game starts at dusk. */
export const HOURS = Object.freeze({ dawn: 6.3, day: 12, golden: 17.2, dusk: 19.2, night: 22.5 });
const PINNABLE = ['day', 'dusk', 'night', 'dawn'];

/**
 * How a game's clock starts: a staged scene is pinned to its own time, `?time=day|dusk|night|dawn` pins one,
 * and anything else cycles from dusk (a loaded save then sets its own hour).
 */
export function startingClock(shot, asked) {
  if (shot) return { time: shot.time ?? 'dusk', cycles: false, staged: true };
  if (PINNABLE.includes(asked)) return { time: asked, cycles: false, staged: false };
  return { time: 'dusk', cycles: true, staged: false };
}

/** The clock for a start: advance(dt, held) moves it on, setHour() is a load's; neither moves a pinned one. */
export function createDayClock({ time = 'dusk', cycles = false } = {}) {
  return {
    cycles,
    hour: HOURS[time] ?? HOURS.dusk,
    advance(dt, held) {
      if (cycles && !held) this.hour = (this.hour + (dt * 24) / DAY_SECONDS) % 24;
    },
    setHour(hour) {
      if (cycles && Number.isFinite(hour)) this.hour = ((hour % 24) + 24) % 24;
    },
  };
}

/** An hour such as 21.67 as "21:40". */
export function clockText(hour) {
  const minutes = Math.min(1439, Math.floor(hour * 60 + 1e-6));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
