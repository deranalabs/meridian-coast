// Career record: what Ilo has done across the whole save (cars stolen, stars lost, busts, deaths, distance driven,
// districts and shops seen) and the one completion percentage the Progress page shows.

/** The counters, in the order the Progress page shows them. */
export const CAREER_COUNTERS = Object.freeze(['stolen', 'starsLost', 'busted', 'wasted', 'metres']);
/** A move longer than this in one step is a teleport (respawn, a loaded save), not driving. */
export const MAX_STEP_METRES = 4;
const MOST = 9999999;
const ID = /^[a-z0-9-]{1,40}$/;

export function createCareer() {
  return { stolen: 0, starsLost: 0, busted: 0, wasted: 0, metres: 0, districts: [], shops: [] };
}

/** Any stored value as a valid career: counters whole and in range, visit lists of unique short ids. */
export function cleanCareer(raw) {
  const out = createCareer();
  if (!raw || typeof raw !== 'object') return out;
  for (const key of CAREER_COUNTERS) {
    const value = raw[key];
    out[key] = Number.isFinite(value) ? Math.max(0, Math.min(MOST, Math.round(value))) : 0;
  }
  const valid = (id) => typeof id === 'string' && ID.test(id);
  const ids = (list) => (Array.isArray(list) ? [...new Set(list.filter(valid))] : []);
  out.districts = ids(raw.districts).slice(0, 16);
  out.shops = ids(raw.shops).slice(0, 64);
  return out;
}

/**
 * One look at the wanted level. A drop counts as stars lost unless Ilo was caught (busted or wasted), and the
 * caught mark holds until the stars are back at 0, so the reset after a bust is never counted.
 */
export function trackStars(watch, career, stars) {
  if (stars < watch.last && !watch.caught) career.starsLost += watch.last - stars;
  if (stars === 0) watch.caught = false;
  watch.last = stars;
}

/** Add the distance between two points driven in one step; a jump past MAX_STEP_METRES adds nothing. */
export function stepDistance(career, from, to) {
  const metres = Math.hypot(to.x - from.x, to.z - from.z);
  if (metres > 0 && metres <= MAX_STEP_METRES) career.metres += metres;
}

/** Note a district or shop as seen; returns whether it is new. */
export function markVisit(list, id) {
  if (!id || list.includes(id)) return false;
  list.push(id);
  return true;
}

/** Distance driven in km, one decimal, for the page. */
export function kilometres(career) {
  return (Math.floor(career.metres / 100) / 10).toFixed(1);
}

/** The share of everything done: the mean of each part's have/of, as a whole percent that is 100 only when all is. */
export function completion(parts) {
  const counted = parts.filter((part) => part.of > 0);
  if (!counted.length) return 0;
  const share = counted.reduce((sum, part) => sum + Math.min(1, part.have / part.of), 0) / counted.length;
  return share >= 1 ? 100 : Math.min(99, Math.floor(share * 100));
}
