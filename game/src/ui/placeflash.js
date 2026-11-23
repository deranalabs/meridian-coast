// Place and car flashes: a large district banner on entering a district (the small label under the minimap stays)
// and the car's name on getting in. The first place and car after a load are silent.
import { DISTRICT_LIST } from '../world/districts.js';
import { FACTION_INFO } from '../palette.js';

/** Seconds a district banner and a car name stay up. */
export const PLACE_SECONDS = 2.8;
export const CAR_SECONDS = 2.2;
/** A name flashed this recently stays quiet, so a drive along a border does not flicker. */
export const QUIET_SECONDS = 20;

export function createFlash() {
  return { seen: false, last: '', text: '', left: 0, clock: 0, shown: new Map() };
}

/**
 * One step of a flash watching `value` (a place or car name, '' for none): returns true when a new flash starts.
 * A change to '' ends the flash at once (out of the car).
 */
export function stepFlash(flash, value, dt, seconds) {
  flash.clock += dt;
  flash.left = Math.max(0, flash.left - dt);
  if (!flash.seen) {
    flash.seen = true;
    flash.last = value;
    return false;
  }
  if (value === flash.last) return false;
  flash.last = value;
  if (!value) {
    flash.left = 0;
    return false;
  }
  const at = flash.shown.get(value);
  if (at !== undefined && flash.clock - at < QUIET_SECONDS) return false;
  flash.shown.set(value, flash.clock);
  flash.text = value;
  flash.left = seconds;
  return true;
}

/** The line under a district's banner: whose turf it is, in that faction's colour; null for places without one. */
export function turfLine(placeName) {
  const district = DISTRICT_LIST.find((entry) => entry.name === placeName);
  const faction = district && Object.values(FACTION_INFO).find((entry) => entry.turf === district.id);
  return faction ? { text: `${faction.name} turf`, colour: faction.colour } : null;
}

/** Make the next place seen flash even if it is the first after a load or the one already shown. */
export function announce(flash) {
  flash.seen = true;
  flash.last = '';
  flash.shown.clear();
}

/** createPlaceFlash(root) → { update(place, car, dt), announce() }; `car` is the driven car's name or ''. */
export function createPlaceFlash(root) {
  const banner = document.createElement('div');
  banner.className = 'place-flash';
  banner.innerHTML = '<b></b><span></span>';
  const carBanner = document.createElement('div');
  carBanner.className = 'car-flash';
  root.append(banner, carBanner);
  const place = createFlash();
  const car = createFlash();

  return {
    announce: () => announce(place),
    update(placeName, carName, dt) {
      if (stepFlash(place, placeName, dt, PLACE_SECONDS)) {
        const turf = turfLine(placeName);
        banner.querySelector('b').textContent = placeName;
        const line = banner.querySelector('span');
        line.textContent = turf?.text ?? '';
        line.style.color = turf?.colour ?? '';
      }
      if (stepFlash(car, carName, dt, CAR_SECONDS)) carBanner.textContent = car.text;
      banner.classList.toggle('show', place.left > 0);
      carBanner.classList.toggle('show', car.left > 0);
    },
  };
}
