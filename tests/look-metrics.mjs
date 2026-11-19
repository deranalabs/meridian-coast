// Image look metrics on RGBA pixels: gradient energy, flat blocks, colour bins, bright share, saturation.

export function luminance(rgba) {
  const count = rgba.length / 4;
  const out = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    out[i] = 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2];
  }
  return out;
}

/** Mean |dL| to the right and down neighbours over all such pixel pairs. */
export function gradEnergy(lum, width, height) {
  let sum = 0;
  let pairs = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (x + 1 < width) {
        sum += Math.abs(lum[i + 1] - lum[i]);
        pairs += 1;
      }
      if (y + 1 < height) {
        sum += Math.abs(lum[i + width] - lum[i]);
        pairs += 1;
      }
    }
  }
  return sum / pairs;
}

/** Share of whole 8x8 blocks whose luminance standard deviation is below `threshold`. */
export function flatBlocks(lum, width, height, threshold = 3) {
  let flat = 0;
  let blocks = 0;
  for (let by = 0; by + 8 <= height; by += 8) {
    for (let bx = 0; bx + 8 <= width; bx += 8) {
      let sum = 0;
      let sumSq = 0;
      for (let y = by; y < by + 8; y += 1) {
        for (let x = bx; x < bx + 8; x += 1) {
          const v = lum[y * width + x];
          sum += v;
          sumSq += v * v;
        }
      }
      const mean = sum / 64;
      const deviation = Math.sqrt(Math.max(0, sumSq / 64 - mean * mean));
      if (deviation < threshold) flat += 1;
      blocks += 1;
    }
  }
  return flat / blocks;
}

/** Number of 4-bit-per-channel colour bins holding more than `share` of the pixels. */
export function colourBins(rgba, share = 0.001) {
  const bins = new Uint32Array(4096);
  const count = rgba.length / 4;
  for (let i = 0; i < count; i += 1) {
    const key = ((rgba[i * 4] >> 4) << 8) | ((rgba[i * 4 + 1] >> 4) << 4) | (rgba[i * 4 + 2] >> 4);
    bins[key] += 1;
  }
  let used = 0;
  for (const bin of bins) if (bin > count * share) used += 1;
  return used;
}

export function brightShare(lum, threshold = 230) {
  let bright = 0;
  for (const v of lum) if (v > threshold) bright += 1;
  return bright / lum.length;
}

export function meanSaturation(rgba) {
  const count = rgba.length / 4;
  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sum += max > 0 ? (max - min) / max : 0;
  }
  return sum / count;
}

/** Overlap area in pixels of two boxes {x, y, width, height}. */
export function overlapArea(a, b) {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * The cover's HUD check. `boxes` are the panels as laid out in the page ({name, x, y, width, height, font},
 * null when a panel is missing or hidden; font is the smallest text in px). Scaled by `scale` (the contact
 * sheet shows 1280x800 at 768x480, so 0.6), every panel must be present, inside the frame, clear of the
 * others (a few pixels of touching allowed) and its smallest text at least `minFont` pixels tall.
 */
export function hudLayout(boxes, viewport, { scale = 0.6, minFont = 6, slack = 16 } = {}) {
  const shown = Object.entries(boxes).filter(([, box]) => box && box.width > 0 && box.height > 0);
  const missing = Object.keys(boxes).filter((name) => !shown.some(([key]) => key === name));
  const offscreen = shown.filter(([, b]) => b.x < 0 || b.y < 0 || b.x + b.width > viewport.width
    || b.y + b.height > viewport.height).map(([name]) => name);
  const small = shown.filter(([, b]) => b.font * scale < minFont).map(([name]) => name);
  const overlaps = [];
  for (let i = 0; i < shown.length; i += 1) {
    for (let j = i + 1; j < shown.length; j += 1) {
      if (overlapArea(shown[i][1], shown[j][1]) > slack) overlaps.push(`${shown[i][0]}+${shown[j][0]}`);
    }
  }
  return { ok: !missing.length && !offscreen.length && !small.length && !overlaps.length, missing, offscreen,
    small, overlaps };
}

/** All five metrics for an RGBA buffer of `width` x `height`. */
export function measure(rgba, width, height) {
  const lum = luminance(rgba);
  return {
    gradEnergy: gradEnergy(lum, width, height),
    flatBlocks: flatBlocks(lum, width, height),
    colors: colourBins(rgba),
    brightShare: brightShare(lum),
    meanSat: meanSaturation(rgba),
  };
}
