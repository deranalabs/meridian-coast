// Full-map projection: world (x east, z south) to screen pixels and back, with uniform zoom and a pannable centre.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

const clamp = (value, lo, hi) => (value < lo ? lo : value > hi ? hi : value);

/** Pixels per metre that fit the whole `bounds` inside width x height without stretching (letterboxed). */
export function fitScale(bounds, width, height) {
  return Math.min(width / (bounds.x1 - bounds.x0), height / (bounds.z1 - bounds.z0));
}

/**
 * A projection over `bounds` drawn into a width x height viewport. Zoom 1 shows the whole world; the centre
 * is clamped so the view never drifts off the map. Points are written into `out` to avoid allocation.
 */
export function createProjection(bounds, width, height) {
  const view = { cx: (bounds.x0 + bounds.x1) / 2, cz: (bounds.z0 + bounds.z1) / 2, zoom: 1, scale: 0, width, height };

  function clampCentre() {
    const halfW = view.width / 2 / view.scale;
    const halfH = view.height / 2 / view.scale;
    const midX = (bounds.x0 + bounds.x1) / 2;
    const midZ = (bounds.z0 + bounds.z1) / 2;
    view.cx = halfW * 2 >= bounds.x1 - bounds.x0 ? midX : clamp(view.cx, bounds.x0 + halfW, bounds.x1 - halfW);
    view.cz = halfH * 2 >= bounds.z1 - bounds.z0 ? midZ : clamp(view.cz, bounds.z0 + halfH, bounds.z1 - halfH);
  }

  function refresh() {
    view.zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
    view.scale = fitScale(bounds, view.width, view.height) * view.zoom;
    clampCentre();
  }
  refresh();

  return {
    view,
    toScreen(x, z, out = {}) {
      out.x = view.width / 2 + (x - view.cx) * view.scale;
      out.y = view.height / 2 + (z - view.cz) * view.scale;
      return out;
    },
    toWorld(sx, sy, out = {}) {
      out.x = view.cx + (sx - view.width / 2) / view.scale;
      out.z = view.cz + (sy - view.height / 2) / view.scale;
      return out;
    },
    resize(w, h) {
      view.width = w;
      view.height = h;
      refresh();
    },
    centreOn(x, z) {
      view.cx = x;
      view.cz = z;
      refresh();
    },
    /** Move the view by a screen distance in pixels. */
    pan(dxPixels, dyPixels) {
      view.cx += dxPixels / view.scale;
      view.cz += dyPixels / view.scale;
      refresh();
    },
    /** Multiply the zoom, keeping the world point under screen (sx, sy) still. */
    zoomBy(factor, sx = view.width / 2, sy = view.height / 2) {
      const anchorX = view.cx + (sx - view.width / 2) / view.scale;
      const anchorZ = view.cz + (sy - view.height / 2) / view.scale;
      view.zoom *= factor;
      view.scale = fitScale(bounds, view.width, view.height) * clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
      view.cx = anchorX - (sx - view.width / 2) / view.scale;
      view.cz = anchorZ - (sy - view.height / 2) / view.scale;
      refresh();
    },
    reset() {
      view.zoom = 1;
      view.cx = (bounds.x0 + bounds.x1) / 2;
      view.cz = (bounds.z0 + bounds.z1) / 2;
      refresh();
    },
  };
}
