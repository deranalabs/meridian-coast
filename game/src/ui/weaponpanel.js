// Weapon panel: a drawn silhouette of the held weapon, its name, clip and reserve ammo, and a reload bar.

const SHAPES = {
  fists: [[6, 14, 22, 18, 6], [10, 10, 14, 6, 4]],
  pistol: [[4, 10, 44, 10, 2], [30, 18, 12, 20, 3]],
  smg: [[4, 10, 60, 12, 2], [36, 22, 10, 22, 2], [52, 20, 10, 16, 3], [64, 13, 10, 5, 1]],
  shotgun: [[2, 10, 70, 7, 2], [10, 17, 30, 7, 2], [52, 10, 26, 14, 4], [66, 18, 12, 14, 3]],
};

function drawWeapon(ctx, id) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.scale(ctx.canvas.width / 80, ctx.canvas.height / 44);
  ctx.fillStyle = '#fff6f0';
  ctx.shadowColor = '#ff4fa0';
  ctx.shadowBlur = 6;
  for (const [x, y, w, h, r] of SHAPES[id] ?? SHAPES.fists) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  ctx.restore();
}

/** Build the panel inside `parent`; update(view) takes {id, name, melee, clip, reserve, reloading, progress}. */
export function createWeaponPanel(parent) {
  const panel = document.createElement('div');
  panel.className = 'weapon';
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 88;
  const text = document.createElement('div');
  text.className = 'ammo';
  const bar = document.createElement('div');
  bar.className = 'reload';
  panel.append(canvas, text, bar);
  parent.appendChild(panel);
  const ctx = canvas.getContext('2d');
  let lastId = '';
  let lastText = '';
  return {
    root: panel,
    update(view) {
      if (view.id !== lastId) {
        drawWeapon(ctx, view.id);
        lastId = view.id;
      }
      const label = view.melee ? `<b>${view.name}</b>` : `<b>${view.clip}</b><i>/ ${view.reserve}</i>`;
      if (label !== lastText) {
        text.innerHTML = label;
        lastText = label;
      }
      bar.style.opacity = view.reloading ? '1' : '0';
      panel.classList.toggle('empty', !view.melee && view.clip === 0);
    },
  };
}
