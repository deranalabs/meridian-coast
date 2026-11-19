// HUD text: a short timed message line, the objective card (the mission slot) and big busted/wasted banners.

/** Build the message line and objective card inside `parent`. */
export function createMessages(parent) {
  const line = document.createElement('div');
  line.className = 'message';
  const objective = document.createElement('div');
  objective.className = 'objective';
  objective.innerHTML = '<span class="tag"></span><span class="text"></span>';
  parent.append(line, objective);
  const tag = objective.querySelector('.tag');
  const text = objective.querySelector('.text');
  const state = { timer: 0, objective: '' };
  return {
    /** Show `html` for `seconds`. */
    say(html, seconds = 3) {
      line.innerHTML = html;
      line.classList.add('show');
      state.timer = seconds;
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
    },
    update(dt) {
      if (state.timer <= 0) return;
      state.timer -= dt;
      if (state.timer <= 0) line.classList.remove('show');
    },
  };
}
