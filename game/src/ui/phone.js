// Phone: P opens Ilo's handset with contacts, open and finished jobs, rank and respect; Enter takes Ilo to a job.
import { CAST, castMember } from '../data/cast.js';
import { STORY_MISSIONS } from '../missions/story/index.js';
import { ACTIVITIES } from '../missions/activities/index.js';
import { RANKS, rankFor } from '../missions/progress.js';
import { nextUnlock, unlockLabel } from '../missions/respect.js';
import { createPhoneView } from './phoneview.js';

const MEET_DISTANCE = 2.2;
const CLOSE_KEYS = ['KeyP', 'Escape', 'Backspace'];

/** Why a job cannot be taken from the phone right now, or null when Ilo can go. */
export function blockReason({ missionActive, stars, mode, down }) {
  if (missionActive) return 'Finish the job you are on first.';
  if (stars > 0) return 'Lose the police before you take a meeting.';
  if (down) return 'Not now.';
  if (mode !== 'foot') return 'Step out of the car first.';
  return null;
}

/** The next rank above `respect`, or null at the top. */
export function nextRank(respect) {
  return RANKS.find((rank) => rank.respect > respect) ?? null;
}

/** The phone over `game` (needs game.missions); update(input) returns true while the phone is open. */
export function createPhone(game, defs = [...STORY_MISSIONS, ...ACTIVITIES]) {
  const missions = game.missions;
  const jobs = defs.map((def) => ({ id: def.id, number: def.number, title: def.title, giver: def.giver,
    place: missions.places.get(def.startAt)?.name ?? '' }));
  const view = createPhoneView(document.body, CAST.filter((person) => person.id !== 'ilo'), jobs, castMember);
  const state = { open: false, selected: null, note: '', froze: false };
  const ui = (kind) => game.action.events.emit('ui', { kind });

  const blocked = () => game.services.shops.openPlace || game.services.respawn.active || game.dialogue?.active;

  function open() {
    if (state.open || blocked()) return false;
    state.open = true;
    state.note = '';
    state.selected = missions.available()[0]?.id ?? null;
    state.froze = game.player.state.mode === 'foot' && !game.player.state.frozen;
    if (state.froze) game.player.state.frozen = true;
    view.root.classList.add('open');
    ui('open');
    return true;
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    if (state.froze) game.player.state.frozen = false;
    state.froze = false;
    view.root.classList.remove('open');
    ui('close');
  }

  /** Walk Ilo to the job's start, facing whoever gives it, and start it. */
  function take(id) {
    const p = game.player.state;
    const reason = blockReason({ missionActive: missions.active, stars: game.action.police.wanted.stars,
      mode: p.mode, down: p.down });
    const def = missions.definition(id);
    if (reason || !def) {
      state.note = reason ?? 'That job is not open yet.';
      ui('deny');
      return false;
    }
    const place = missions.places.get(defs.find((entry) => entry.id === id)?.startAt);
    const outX = place?.outX ?? 0;
    const outZ = place?.outZ ?? 1;
    close();
    game.player.placeOnFoot(def.startAt.x + outX * MEET_DISTANCE, def.startAt.z + outZ * MEET_DISTANCE,
      Math.atan2(-outX, -outZ));
    return missions.start(id);
  }

  function move(step) {
    const open = missions.available().map((def) => def.id);
    if (!open.length) return;
    const index = open.indexOf(state.selected);
    state.selected = open[(index + step + open.length) % open.length];
    ui('move');
  }

  function render() {
    const progress = missions.progress;
    const next = nextRank(progress.respect);
    const minutes = (20 * 60 + Math.floor(game.time / 4)) % 1440;
    const opens = nextUnlock(progress.respect)?.opens.map(unlockLabel).join(', ') ?? '';
    view.render({ rank: rankFor(progress.respect).name, respect: progress.respect, nextRank: next?.name ?? null,
      nextRespect: next?.respect ?? null, opens, done: new Set(progress.done),
      open: new Set(missions.available().map((def) => def.id)), selected: state.selected,
      note: state.note || (missions.active ? 'On a job. Finish it, or fail it, to take another.' : ''),
      time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}` });
  }

  return {
    state,
    open,
    close,
    take,
    get isOpen() {
      return state.open;
    },
    /** One step; returns true when the phone used this step's keys (open now, or closed by them). */
    update(input) {
      if (!state.open) {
        if (input.pressed('KeyP')) open();
        if (state.open) render();
        return state.open;
      }
      if (blocked() || CLOSE_KEYS.some((code) => input.pressed(code))) close();
      else if (input.pressed('ArrowDown') || input.pressed('KeyS')) move(1);
      else if (input.pressed('ArrowUp') || input.pressed('KeyW')) move(-1);
      else if (input.pressed('Enter') && state.selected) take(state.selected);
      if (state.open) render();
      return true;
    },
  };
}
