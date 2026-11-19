// Radio: Port Meridian's stations and their now-playing lines; R cycles the station.

export const STATIONS = [
  {
    name: 'CORAL 98.1',
    tracks: [['The Low Tides', 'Salt on the Dashboard'], ['Velma Sunday', 'Neon Undertow'],
      ['Harbor Lights Club', 'Pink Hour']],
  },
  {
    name: 'KDRIFT 104.7',
    tracks: [['Juno Vance', 'Handbrake Heart'], ['Static Palms', 'Causeway at 3AM'], ['Mira Okonjo', 'Overpass']],
  },
  {
    name: 'CALDER CLASSIC',
    tracks: [['The Bellfry Quartet', 'Olive Steps Waltz'], ['Rosa Quintero', 'Hill Road Serenade']],
  },
  {
    name: 'TALK MERIDIAN',
    tracks: [['Dawn Ruiz', 'Late Calls on the Coast'], ['Ben Achterberg', 'Parking Tickets Hour']],
  },
];

/** Tracks the current station and track; line() returns the HUD text. */
export function createRadio(stationIndex = 0) {
  const state = { station: stationIndex, track: 0, elapsed: 0 };
  return {
    state,
    next() {
      state.station = (state.station + 1) % STATIONS.length;
      state.track = 0;
      state.elapsed = 0;
    },
    update(dt) {
      state.elapsed += dt;
      if (state.elapsed > 150) {
        state.elapsed = 0;
        state.track = (state.track + 1) % STATIONS[state.station].tracks.length;
      }
    },
    line() {
      const station = STATIONS[state.station];
      const [artist, title] = station.tracks[state.track];
      return { station: station.name, text: `${artist} · ${title}` };
    },
  };
}
