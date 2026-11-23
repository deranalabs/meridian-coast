// Mission panel: "Job n of m" badge, title, giver and reward, "Stage n of m", the objective, ticked steps, the next
// step, a progress bar and the fail state.

function node(parent, className, tag = 'div') {
  const el = document.createElement(tag);
  el.className = className;
  parent.appendChild(el);
  return el;
}

/**
 * The panel inside `parent`. update(view) takes null (hidden) or {job, title, giver, colour, stage, objective, next,
 * progress (0..1 or null), failed: {text, keys} or null}; DOM work is skipped while nothing changes.
 */
export function createMissionPanel(parent) {
  const root = node(parent, 'mission-panel');
  const head = node(root, 'mp-head');
  const job = node(head, 'mp-job');
  const title = node(head, 'mp-title');
  const stage = node(head, 'mp-stage');
  const giverRow = node(root, 'mp-giver');
  const giver = node(giverRow, 'mp-for', 'span');
  const reward = node(giverRow, 'mp-reward', 'span');
  const objective = node(root, 'mp-objective');
  const steps = node(root, 'mp-steps');
  const bar = node(node(root, 'mp-bar'), 'mp-fill');
  const next = node(root, 'mp-next');
  const failed = node(root, 'mp-failed');
  let key = '';
  let fill = -1;
  return {
    root,
    update(view) {
      const progress = view?.progress ?? null;
      const shownFill = progress === null ? -1 : Math.round(progress * 50) / 50;
      if (shownFill !== fill) {
        fill = shownFill;
        bar.parentElement.style.display = fill < 0 ? 'none' : 'block';
        bar.style.width = `${Math.max(0, fill) * 100}%`;
      }
      const stepKey = view?.steps?.map((step) => step.state[0]).join('') ?? '';
      const nextKey = view ? [view.job, view.title, view.giver, view.colour, view.stage, view.objective, view.next,
        view.failed?.text ?? '', view.reward?.cash ?? '', stepKey].join('|') : '';
      if (nextKey === key) return;
      key = nextKey;
      root.classList.toggle('show', Boolean(view));
      if (!view) return;
      root.style.setProperty('--mp-accent', view.colour ?? 'var(--mc-gold)');
      job.textContent = view.job ?? '';
      title.textContent = view.title;
      stage.textContent = view.stage;
      giver.textContent = view.giver ? `Job for ${view.giver}` : '';
      // The respect has its own span: a small window drops it and keeps the cash.
      reward.innerHTML = view.reward ? `<b>${view.reward.cash}</b><span>${view.reward.respect}</span>` : '';
      // ✓ done, ▸ now, nothing for the steps still ahead.
      steps.innerHTML = (view.steps ?? []).map(({ name, state }) => `<span class="${state}">`
        + `${state === 'done' ? '&#10003; ' : state === 'now' ? '&#9656; ' : ''}${name}</span>`).join('');
      steps.style.display = view.steps?.length > 1 ? '' : 'none';
      objective.innerHTML = view.objective ?? '';
      next.innerHTML = view.next ? `<span>Next</span> ${view.next}` : '';
      next.style.display = view.next ? 'block' : 'none';
      root.classList.toggle('failed', Boolean(view.failed));
      failed.innerHTML = view.failed ? `<b>Mission failed</b>${view.failed.text}<small>${view.failed.keys}</small>`
        : '';
    },
  };
}
