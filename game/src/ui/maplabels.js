// Where the map's labels go and how big they are: each takes the free spot nearest its point, in priority order.

/** Space kept round a label, in pixels. */
const PAD = 2;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Type sizes for a map `width` by `height` pixels: large enough that the words survive a screen shrunk fivefold. */
export function labelSizes(width, height) {
  const scale = clamp(Math.min(width / 940, height / 600), 0.56, 1.2);
  const size = (full) => Math.round(full * scale);
  return { district: size(40), park: size(24), job: size(32), landmark: size(22) };
}

/** The area two boxes share; a box is {x, y, width, height} about its centre. */
function sharedArea(a, b) {
  const across = (a.width + b.width) / 2 - Math.abs(a.x - b.x);
  const down = (a.height + b.height) / 2 - Math.abs(a.y - b.y);
  return across > 0 && down > 0 ? Math.min(across, a.width, b.width) * Math.min(down, a.height, b.height) : 0;
}

export function boxesOverlap(a, b) {
  return sharedArea(a, b) > 0;
}

/** Centres to try, nearest first: on the point or above its mark, under it, beside it, then further out. */
function* spots({ x, y, width, height, rise = 0 }) {
  yield [x, rise ? y - rise - height / 2 : y];
  if (rise) {
    yield [x, y + height / 2 + 10];
    yield [x + width / 2 + 18, y - rise / 2];
    yield [x - width / 2 - 18, y - rise / 2];
  }
  for (let ring = 1; ring <= 5; ring += 1) {
    const step = ring * (height + PAD * 2) * 0.75;
    for (const side of [0, -0.3, 0.3, -0.6, 0.6]) {
      yield [x + width * side, y - rise / 2 - step];
      yield [x + width * side, y - rise / 2 + step];
    }
  }
}

/**
 * Place `items` ({text, x, y, width, height, rise, optional}) inside `view`, earlier ones first, clear of each
 * other and of `obstacles` (boxes). Returns the items with x and y moved to their labels' centres: an optional
 * one with no room is left out, a needed one takes the least crowded spot, and one whose point is off the map
 * is not drawn.
 */
export function placeLabels(items, view, obstacles = []) {
  const taken = [...obstacles];
  const placed = [];
  for (const item of items) {
    if (item.x < 0 || item.y < 0 || item.x > view.width || item.y > view.height) continue;
    const halfW = Math.min(item.width / 2 + PAD, view.width / 2);
    const halfH = Math.min(item.height / 2 + PAD, view.height / 2);
    let best = null;
    let least = Infinity;
    for (const [atX, atY] of spots(item)) {
      const x = clamp(atX, halfW, view.width - halfW);
      const y = clamp(atY, halfH, view.height - halfH);
      const padded = { x, y, width: item.width + PAD * 2, height: item.height + PAD * 2 };
      let covered = 0;
      for (const box of taken) covered += sharedArea(padded, box);
      if (covered >= least) continue;
      least = covered;
      best = { ...item, x, y };
      if (!covered) break;
    }
    if (!best || (least > 0 && item.optional)) continue;
    taken.push(best);
    placed.push(best);
  }
  return placed;
}
