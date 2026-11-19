// Conversations: a queue of spoken lines with typewriter pacing, a skip key and automatic advance, no DOM.

export const CHARS_PER_SECOND = 42;
const PAUSES = { '.': 0.22, '!': 0.22, '?': 0.22, ',': 0.1, ';': 0.12, ':': 0.12 };

/** When each character of `text` appears, in seconds from the start of the line. */
export function revealTimes(text, cps = CHARS_PER_SECOND) {
  const times = new Float32Array(text.length);
  let t = 0;
  for (let i = 0; i < text.length; i += 1) {
    times[i] = t;
    t += 1 / cps + (PAUSES[text[i]] && text[i + 1] === ' ' ? PAUSES[text[i]] : 0);
  }
  return times;
}

/** How many characters show after `elapsed` seconds. */
export function visibleCount(times, elapsed) {
  let count = 0;
  while (count < times.length && times[count] <= elapsed) count += 1;
  return count;
}

/** How long a finished line stays before it moves on by itself. */
export const holdTime = (text) => 1.4 + text.length / 28;

/** A line from mission data: [speaker, text] or {speaker, text}. */
const normalise = (line) => (Array.isArray(line) ? { speaker: line[0], text: line[1] } : { ...line });

/**
 * The conversation queue. queue(lines, done) adds a conversation that plays after those before it; update(dt)
 * advances the typewriter; skip() finishes the line or, once finished, moves to the next. onLine(line) fires
 * as each line starts (for the voice blips and the card).
 */
export function createConversation({ cps = CHARS_PER_SECOND, onLine = () => {}, onEnd = () => {} } = {}) {
  const waiting = [];
  const state = { lines: null, done: null, index: 0, elapsed: 0, held: 0, times: null, line: null, shown: 0 };

  function startLine() {
    state.line = state.lines[state.index];
    state.times = revealTimes(state.line.text, cps);
    state.elapsed = 0;
    state.held = 0;
    state.shown = 0;
    onLine(state.line, state.index);
  }

  function startNext() {
    while (waiting.length) {
      const next = waiting.shift();
      if (!next.lines.length) {
        next.done?.();
        continue;
      }
      state.lines = next.lines;
      state.done = next.done;
      state.index = 0;
      startLine();
      return;
    }
    state.lines = null;
    state.line = null;
  }

  function advance() {
    state.index += 1;
    if (state.index < state.lines.length) {
      startLine();
      return;
    }
    const done = state.done;
    state.lines = null;
    state.line = null;
    done?.();
    onEnd();
    if (!state.lines) startNext();
  }

  const complete = () => state.line && state.shown >= state.line.text.length;

  return {
    state,
    get active() {
      return Boolean(state.line);
    },
    get line() {
      return state.line;
    },
    /** The visible part of the current line. */
    get text() {
      return state.line ? state.line.text.slice(0, state.shown) : '';
    },
    get complete() {
      return Boolean(complete());
    },
    queue(lines, done) {
      waiting.push({ lines: (lines ?? []).map(normalise), done });
      if (!state.line) startNext();
    },
    skip() {
      if (!state.line) return;
      if (complete()) advance();
      else {
        state.shown = state.line.text.length;
        state.elapsed = state.times[state.times.length - 1] ?? 0;
      }
    },
    /** Drop everything without calling the callbacks (a mission quit mid-talk). */
    clear() {
      waiting.length = 0;
      state.lines = null;
      state.line = null;
    },
    update(dt) {
      if (!state.line) return;
      if (!complete()) {
        state.elapsed += dt;
        state.shown = visibleCount(state.times, state.elapsed);
        return;
      }
      state.held += dt;
      if (state.held >= holdTime(state.line.text)) advance();
    },
  };
}
