// HUD rank bar: the rung on the rank ladder and its name, the respect total and what is left to the next, a gold bar.
import { rankProgress } from '../missions/respect.js';

/** The rung before the rank name. */
export const rankStep = (progress) => `Rank ${progress.step} of ${progress.steps}`;

/** The line under the rank name: the respect total and the points left to the next rank, or a word at the top. */
export function rankLine(progress) {
  const total = Math.floor(progress.respect);
  const left = progress.next ? `${Math.ceil(progress.span - progress.gained)} to ${progress.next}` : 'Top rank';
  return `${total} respect · ${left}`;
}

/** createRankBar(parent) → { root, update(respect) }; update touches the DOM only when the whole points change. */
export function createRankBar(parent) {
  const root = document.createElement('div');
  root.className = 'rankbar';
  root.innerHTML = '<div class="rank-line"><span class="rank-step"></span><b class="rank-name"></b></div>'
    + '<div class="rank-next"></div><div class="rank-track"><div class="rank-fill"></div></div>';
  parent.appendChild(root);
  const step = root.querySelector('.rank-step');
  const name = root.querySelector('.rank-name');
  const next = root.querySelector('.rank-next');
  const fill = root.querySelector('.rank-fill');
  let last = null;

  return {
    root,
    update(respect) {
      const points = Math.floor(Math.max(0, respect || 0));
      if (points === last) return;
      last = points;
      const progress = rankProgress(points);
      step.textContent = rankStep(progress);
      name.textContent = progress.name;
      next.textContent = rankLine(progress);
      fill.style.width = `${Math.round(progress.fraction * 100)}%`;
    },
  };
}
