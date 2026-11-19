// Cover: low street props (bins, benches, planters, news boxes, hydrants) and cars that a crouching body hides behind.

const LOW_PROPS = ['bin', 'bench', 'planter', 'news', 'hydrant', 'bollard', 'meter'];
const CELL = 8;
const REACH = 1.5;

/** Index the low props once; near(x, z) returns the closest cover {x, z} within reach (cars included). */
export function createCover(placements, cars) {
  const grid = new Map();
  for (const type of LOW_PROPS) {
    for (const p of placements[type] ?? []) {
      const key = `${Math.floor(p.x / CELL)},${Math.floor(p.z / CELL)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push({ x: p.x, z: p.z, type });
    }
  }
  return {
    near(x, z) {
      let best = null;
      let bestDistance = REACH;
      const gx = Math.floor(x / CELL);
      const gz = Math.floor(z / CELL);
      for (let i = -1; i <= 1; i += 1) {
        for (let k = -1; k <= 1; k += 1) {
          for (const p of grid.get(`${gx + i},${gz + k}`) ?? []) {
            const d = Math.hypot(p.x - x, p.z - z);
            if (d < bestDistance) {
              bestDistance = d;
              best = p;
            }
          }
        }
      }
      for (const car of cars) {
        if (!car.visible) continue;
        const d = Math.hypot(car.position.x - x, car.position.z - z) - car.spec.width * 0.6;
        if (d < bestDistance) {
          bestDistance = d;
          best = { x: car.position.x, z: car.position.z, type: 'car' };
        }
      }
      return best;
    },
  };
}
