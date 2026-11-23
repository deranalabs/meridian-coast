// Career watch: feeds the career record from play (cars taken, busts, deaths, stars shaken off, metres driven,
// districts entered, shops opened). Staged scenes keep the record they were seeded with.
import { createCareer, cleanCareer, trackStars, stepDistance, markVisit } from '../stats/career.js';
import { districtAt } from '../world/districts.js';

/** Districts are looked up this often, in seconds; the counters and the distance run every step. */
const DISTRICT_EVERY = 0.5;

export function createCareerWatch(game, { staged = false } = {}) {
  let career = createCareer();
  const stars = { last: 0, caught: false };
  const was = { x: 0, z: 0, driving: false };
  let districtTimer = 0;

  if (!staged) {
    const { events } = game.action;
    events.on('car-taken', () => { career.stolen += 1; });
    for (const kind of ['busted', 'wasted']) {
      events.on(kind, () => {
        career[kind] += 1;
        stars.caught = true;
      });
    }
    events.on('ui', (event) => {
      if (event.kind === 'open' && event.place) markVisit(career.shops, event.place);
    });
  }

  return {
    get record() {
      return career;
    },
    /** A saved record (or none); the stars start from the live level so loading never counts as shaking them. */
    restore(saved) {
      career = cleanCareer(saved);
      stars.last = game.action.police.wanted.stars;
    },
    update(dt) {
      if (staged) return;
      trackStars(stars, career, game.action.police.wanted.stars);
      const { mode, car } = game.player.state;
      const driving = mode === 'driving' && Boolean(car);
      const at = driving ? car.position : game.ilo.position;
      if (driving && was.driving) stepDistance(career, was, at);
      was.x = at.x;
      was.z = at.z;
      was.driving = driving;
      districtTimer -= dt;
      if (districtTimer > 0) return;
      districtTimer = DISTRICT_EVERY;
      markVisit(career.districts, districtAt(at.x, at.z)?.id);
    },
  };
}
