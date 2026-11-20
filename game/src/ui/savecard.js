// Continue card text: turns a parsed save into the title screen's card lines (slot, story point, cash, saved at).
import { STORY_MISSIONS } from '../missions/story/index.js';
import { rankFor } from '../missions/progress.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n) => String(n).padStart(2, '0');

/** "Fri 20 Nov, 21:14" in the player's own clock, or '' for a save with no stamp. */
export function savedAtText(savedAt) {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return '';
  const at = new Date(savedAt);
  return `${DAYS[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}, ${two(at.getHours())}:${two(at.getMinutes())}`;
}

/** Where the story stands: the next mission not done, as { step, total, title }; step = total + 1 when done. */
export function storyPoint(progress, missions = STORY_MISSIONS) {
  const done = progress?.done ?? [];
  const index = missions.findIndex((def) => !done.includes(def.id));
  if (index < 0) return { step: missions.length + 1, total: missions.length, title: 'Story complete' };
  return { step: index + 1, total: missions.length, title: missions[index].title };
}

/** The card's lines for a normalised save (from parseSave): { slot, chapter, mission, cash, saved }. */
export function saveCardText(save, slot = 1) {
  const point = storyPoint(save.missions);
  const finished = point.step > point.total;
  return {
    slot: `Slot ${slot} · ${rankFor(save.missions?.respect ?? 0).name}`,
    chapter: finished ? `All ${point.total} missions done` : `Mission ${point.step} of ${point.total}`,
    mission: point.title,
    cash: `$${Math.max(0, Math.round(save.cash)).toLocaleString('en-US')}`,
    saved: savedAtText(save.savedAt) ? `Saved ${savedAtText(save.savedAt)}` : 'Saved at an unknown time',
  };
}
