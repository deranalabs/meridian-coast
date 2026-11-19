// Radio: what each station is airing now (a song, the host talking, an ad), news flashes that break in when
// Ilo makes the headlines, and R to cycle the station. Deterministic: every pick walks a counter, no dice.
import { STATIONS, ADS, MISSION_NEWS, EVENT_NEWS } from './radiocontent.js';

export { STATIONS };

/** The programme: what follows what, and how long each segment holds the radio line (seconds). */
export const PROGRAMME = Object.freeze(['song', 'dj', 'song', 'ad']);
export const SEGMENT_SECONDS = Object.freeze({ song: 42, dj: 7, ad: 9, news: 10 });
const NEWS_GAP = 25;

/** Text for a segment of `kind` on station `index`, `count` being how many of that kind have aired. */
export function segmentText(kind, index, count) {
  const station = STATIONS[index];
  if (kind === 'song') {
    const [artist, title] = station.tracks[count % station.tracks.length];
    return `${artist} · ${title}`;
  }
  if (kind === 'dj') return `${station.host}: "${station.dj[count % station.dj.length]}"`;
  return ADS[(count * 3 + index) % ADS.length];
}

/** Tracks the station and its programme; hear(name, data) turns game events into queued news lines. */
export function createRadio(stationIndex = 0) {
  const state = { station: stationIndex, slot: 0, elapsed: 0, news: null, newsTime: 0, quiet: 0 };
  const counts = { song: 0, dj: 0, ad: 0 };
  const queue = [];
  const said = new Set();
  let text = segmentText('song', state.station, 0);

  function air(kind) {
    text = segmentText(kind, state.station, counts[kind]);
    counts[kind] += 1;
  }

  function queueNews(line, once = null) {
    if (once && said.has(once)) return;
    if (once) said.add(once);
    if (!queue.includes(line) && queue.length < 3) queue.push(line);
  }

  return {
    state,
    next() {
      state.station = (state.station + 1) % STATIONS.length;
      state.slot = 0;
      state.elapsed = 0;
      air('song');
    },
    /** A game event: mission passes and failures, wanted level changes, arrests and hospital runs. */
    hear(name, data = {}) {
      if (name === 'mission-passed') queueNews(MISSION_NEWS[data.id] ?? (data.id === 'causeway-sprint'
        ? EVENT_NEWS.race : `${STATIONS[3].host}: word is somebody got paid tonight.`));
      else if (name === 'mission-failed') queueNews(EVENT_NEWS.failed);
      else if (name === 'wanted' && data.stars >= 4) queueNews(EVENT_NEWS.helicopter, `air-${Math.floor(state.quiet)}`);
      else if (name === 'wanted' && data.stars >= 3) queueNews(EVENT_NEWS.chase, `chase-${Math.floor(state.quiet)}`);
      else if (name === 'busted') queueNews(EVENT_NEWS.busted);
      else if (name === 'wasted') queueNews(EVENT_NEWS.wasted);
    },
    /** Subscribe to the game's event bus. */
    listen(events) {
      for (const name of ['mission-passed', 'mission-failed', 'wanted', 'busted', 'wasted']) {
        events.on(name, (data) => this.hear(name, data));
      }
    },
    update(dt) {
      state.elapsed += dt;
      state.quiet += dt / NEWS_GAP;
      if (state.news) {
        state.newsTime -= dt;
        if (state.newsTime <= 0) state.news = null;
        return;
      }
      if (queue.length) {
        state.news = queue.shift();
        state.newsTime = SEGMENT_SECONDS.news;
        return;
      }
      const kind = PROGRAMME[state.slot];
      if (state.elapsed < SEGMENT_SECONDS[kind]) return;
      state.elapsed = 0;
      state.slot = (state.slot + 1) % PROGRAMME.length;
      air(PROGRAMME[state.slot]);
    },
    /** The HUD line: {station, text, kind} where kind is song, dj, ad or news. */
    line() {
      const station = STATIONS[state.station].name;
      if (state.news) return { station, text: state.news, kind: 'news' };
      return { station, text, kind: PROGRAMME[state.slot] };
    },
  };
}
