// HUD rank bar: Ilo's rank name, respect earned toward the next rank as a thin gold bar, and that rank's name.
import { rankProgress } from '../missions/respect.js';

/** The line beside the rank name: points toward the next rank, or a flat word at the top. */
export function rankLine(progress) {
  return progress.next ? `${Math.floor(progress.gained)}/${progress.span} to ${progress.next}` : 'Top rank';
}

/** createRankBar(parent) → { root, update(respect) }; update touches the DOM only when the whole points change. */
export function createRankBar(parent) {
  const root = document.createElement('div');
  root.className = 'rankbar';
  root.innerHTML = '<div class="rank-line"><b class="rank-name"></b><span class="rank-next"></span></div>'
    + '<div class="rank-track"><div class="rank-fill"></div></div>';
  parent.appendChild(root);
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
      name.textContent = progress.name;
      next.textContent = rankLine(progress);
      fill.style.width = `${Math.round(progress.fraction * 100)}%`;
    },
  };
}
