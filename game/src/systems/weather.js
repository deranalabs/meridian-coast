// Weather rules: clear or rain, T switches, the rain eases in and out, and staged dry scenes stay dry. Not saved.

/** Seconds for the rain to come on fully or to stop. */
const EASE_SECONDS = 4;

/**
 * How a game starts: a staged scene has the weather it names (dry when it names none) and cannot be switched, so
 * the cover and the sheet never rain; free play takes `?weather=rain` and the T key.
 */
export function startingWeather(shot, asked) {
  if (shot) return { state: shot.weather === 'rain' ? 'rain' : 'clear', locked: true };
  return { state: asked === 'rain' ? 'rain' : 'clear', locked: false };
}

/** The weather now: `amount` runs 0..1 toward the state's end. toggle() returns the new state, or null if locked. */
export function createWeather({ state = 'clear', locked = false } = {}) {
  return {
    state,
    amount: state === 'rain' ? 1 : 0,
    toggle() {
      if (locked) return null;
      this.state = this.state === 'rain' ? 'clear' : 'rain';
      return this.state;
    },
    update(dt) {
      const step = dt / EASE_SECONDS;
      this.amount = this.state === 'rain' ? Math.min(1, this.amount + step) : Math.max(0, this.amount - step);
    },
  };
}
