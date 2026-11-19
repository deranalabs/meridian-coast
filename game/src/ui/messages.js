// HUD text: a queued message line (objective lines wait their turn), the objective card and the mission slot.

const QUEUE_LIMIT = 5;
/** Kinds that are never cut short: they queue and each gets its full time on screen. */
const STICKY = new Set(['objective', 'passed', 'failed']);

/** Build the message line inside `parent` and the objective card inside `cardParent` (default the same). */
export function createMessages(parent, cardParent = parent) {
  const line = document.createElement('div');
  line.className = 'message';
  const objective = document.createElement('div');
  objective.className = 'objective';
  objective.innerHTML = '<span class="tag"></span><span class="text"></span>';
  parent.append(line);
  cardParent.append(objective);
  const tag = objective.querySelector('.tag');
  const text = objective.querySelector('.text');
  const state = { timer: 0, current: null, objective: '' };
  const queue = [];

  function show(entry) {
    state.current = entry;
    state.timer = entry.seconds;
    line.innerHTML = entry.html;
    line.className = `message show${entry.kind ? ` ${entry.kind}-line` : ''}`;
  }

  return {
    queue,
    /**
     * Show `html` for `seconds`. Plain lines replace a plain line on screen; 'objective', 'passed' and 'failed'
     * lines (and plain lines arriving while one of those shows) wait in order. The same text twice is dropped.
     */
    say(html, seconds = 3, kind = '') {
      const entry = { html, seconds, kind };
      const busy = state.current && state.timer > 0;
      if (busy && state.current.html === html) return;
      if (queue.some((queued) => queued.html === html)) return;
      if (!busy || (!STICKY.has(kind) && !STICKY.has(state.current.kind))) {
        show(entry);
        return;
      }
      if (queue.length >= QUEUE_LIMIT) {
        const plain = queue.findIndex((queued) => !STICKY.has(queued.kind));
        if (plain < 0) return;
        queue.splice(plain, 1);
      }
      queue.push(entry);
    },
    /** Drop every waiting line and hide the one on screen. */
    clear() {
      queue.length = 0;
      state.timer = 0;
      state.current = null;
      line.classList.remove('show');
    },
    /** The mission slot: `label` (e.g. JOB, HEAT) and its objective text; empty text hides it. */
    setObjective(label, html) {
      const key = `${label}|${html}`;
      if (key === state.objective) return;
      state.objective = key;
      tag.textContent = label;
      text.innerHTML = html;
      objective.classList.toggle('show', Boolean(html));
      objective.classList.toggle('heat', label === 'HEAT');
      objective.classList.toggle('idle', label === 'NO MISSION');
    },
    update(dt) {
      if (state.timer <= 0) return;
      state.timer -= dt;
      if (state.timer > 0) return;
      if (queue.length) show(queue.shift());
      else {
        state.current = null;
        line.classList.remove('show');
      }
    },
  };
}
