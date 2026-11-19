// Static colliders: building boxes and round landmarks in a spatial hash, with circle push-out queries.

const CELL = 20;

/** Boxes are {x0, z0, x1, z1}; circles are {x, z, r}. resolveCircle pushes a circle out of anything it hits. */
export function createColliders() {
  const grid = new Map();
  const shapes = [];

  function insert(shape, x0, z0, x1, z1) {
    shapes.push(shape);
    for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx += 1) {
      for (let gz = Math.floor(z0 / CELL); gz <= Math.floor(z1 / CELL); gz += 1) {
        const key = `${gx},${gz}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(shape);
      }
    }
  }

  function nearby(x, z, r) {
    const found = new Set();
    for (let gx = Math.floor((x - r) / CELL); gx <= Math.floor((x + r) / CELL); gx += 1) {
      for (let gz = Math.floor((z - r) / CELL); gz <= Math.floor((z + r) / CELL); gz += 1) {
        const list = grid.get(`${gx},${gz}`);
        if (list) for (const shape of list) found.add(shape);
      }
    }
    return found;
  }

  return {
    shapes,
    addBox(box) {
      insert({ type: 'box', ...box }, box.x0, box.z0, box.x1, box.z1);
    },
    addCircle(circle) {
      insert({ type: 'circle', ...circle }, circle.x - circle.r, circle.z - circle.r, circle.x + circle.r,
        circle.z + circle.r);
    },
    /** Push circle (x, z, r) out of colliders; returns {x, z, hit, nx, nz} with the last contact normal. */
    resolveCircle(x, z, r) {
      let px = x;
      let pz = z;
      let hit = false;
      let nx = 0;
      let nz = 0;
      for (const shape of nearby(x, z, r)) {
        if (shape.type === 'box') {
          const cx = Math.max(shape.x0, Math.min(px, shape.x1));
          const cz = Math.max(shape.z0, Math.min(pz, shape.z1));
          let dx = px - cx;
          let dz = pz - cz;
          let distance = Math.hypot(dx, dz);
          if (distance >= r) continue;
          if (distance < 1e-6) {
            const left = px - shape.x0;
            const right = shape.x1 - px;
            const top = pz - shape.z0;
            const bottom = shape.z1 - pz;
            const least = Math.min(left, right, top, bottom);
            dx = least === left ? -1 : least === right ? 1 : 0;
            dz = least === top ? -1 : least === bottom ? 1 : 0;
            distance = 0;
            px += dx * (least + r);
            pz += dz * (least + r);
          } else {
            px += (dx / distance) * (r - distance);
            pz += (dz / distance) * (r - distance);
            dx /= distance;
            dz /= distance;
          }
          hit = true;
          nx = dx;
          nz = dz;
        } else {
          const dx = px - shape.x;
          const dz = pz - shape.z;
          const distance = Math.hypot(dx, dz);
          if (distance >= r + shape.r || distance < 1e-6) continue;
          px = shape.x + (dx / distance) * (r + shape.r);
          pz = shape.z + (dz / distance) * (r + shape.r);
          hit = true;
          nx = dx / distance;
          nz = dz / distance;
        }
      }
      return { x: px, z: pz, hit, nx, nz };
    },
  };
}
