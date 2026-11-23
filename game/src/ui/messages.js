// HUD text: a queued message line (objective lines wait their turn), the objective card and the mission slot.
import { countUp } from '../missions/steplist.js';

const QUEUE_LIMIT = 5;
/** How long a passed job's pay takes to count up. */
const COUNT_SECONDS = 1.2;
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
    // A passed job's pay counts up from $0 to the amount the line was given.
    const pay = entry.kind === 'passed' ? line.querySelector('em') : null;
    const target = Number(pay?.textContent.replace(/[^0-9]/g, '') ?? 0);
    state.count = pay && target > 0 ? { pay, target, seconds: 0 } : null;
    if (state.count) pay.textContent = '+$0';
  }

  function countPay(dt) {
    const count = state.count;
    if (!count) return;
    count.seconds += dt;
    count.pay.textContent = `+$${countUp(count.target, count.seconds).toLocaleString('en-US')}`;
    if (count.seconds >= COUNT_SECONDS) state.count = null;
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
    /** Drop the lines of one kind (a retry ends the 'failed' line); the next waiting line shows at once. */
    drop(kind) {
      for (let i = queue.length - 1; i >= 0; i -= 1) if (queue[i].kind === kind) queue.splice(i, 1);
      if (state.current?.kind !== kind) return;
      state.timer = 0;
      if (queue.length) show(queue.shift());
      else {
        state.current = null;
        line.classList.remove('show');
      }
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
      countPay(dt);
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
