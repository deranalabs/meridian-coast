// Unit tests for the radio: the programme order, ads and DJ lines, news flashes from game events, R cycling.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRadio, STATIONS, PROGRAMME, SEGMENT_SECONDS, segmentText } from './radio.js';
import { ADS, MISSION_NEWS, EVENT_NEWS } from './radiocontent.js';
import { STORY_MISSIONS } from '../missions/story/index.js';

/** Step the radio by `seconds` in frame-sized steps. */
function run(radio, seconds) {
  for (let t = 0; t < seconds; t += 0.5) radio.update(0.5);
}

test('at least three stations, each with a host, songs and patter, and every story job makes the news', () => {
  assert.ok(STATIONS.length >= 3);
  for (const station of STATIONS) assert.ok(station.host && station.tracks.length >= 2 && station.dj.length >= 2);
  for (const def of STORY_MISSIONS) assert.ok(MISSION_NEWS[def.id], def.id);
  assert.ok(ADS.length >= 5);
});

test('the programme runs song, DJ, song, ad and the HUD line says which', () => {
  const radio = createRadio(0);
  const kinds = [radio.line().kind];
  for (let i = 0; i < PROGRAMME.length; i += 1) {
    run(radio, SEGMENT_SECONDS[kinds.at(-1)] + 0.5);
    kinds.push(radio.line().kind);
  }
  assert.deepEqual(kinds, ['song', 'dj', 'song', 'ad', 'song']);
  assert.match(segmentText('dj', 1, 0), /^Juno Clement: "/);
  assert.equal(radio.line().station, 'CORAL 98.1');
});

test('a passed job and a chase break in as news, once each, then the programme resumes', () => {
  const radio = createRadio(1);
  radio.hear('mission-passed', { id: 'gilded-tide' });
  radio.hear('wanted', { stars: 3 });
  radio.hear('wanted', { stars: 3 });
  radio.update(0.1);
  assert.deepEqual(radio.line(), { station: 'KDRIFT 104.7', text: MISSION_NEWS['gilded-tide'], kind: 'news' });
  run(radio, SEGMENT_SECONDS.news + 0.5);
  assert.equal(radio.line().text, EVENT_NEWS.chase);
  run(radio, SEGMENT_SECONDS.news + 1);
  assert.notEqual(radio.line().kind, 'news');
  radio.hear('wanted', { stars: 1 });
  radio.update(0.1);
  assert.notEqual(radio.line().kind, 'news', 'one star is not news');
});

test('R cycles the stations and wraps', () => {
  const radio = createRadio(0);
  for (let i = 0; i < STATIONS.length; i += 1) radio.next();
  assert.equal(radio.state.station, 0);
  assert.equal(radio.line().kind, 'song');
});
