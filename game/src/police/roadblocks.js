// Roadblocks: two cruisers parked across a road ahead of the fleeing player, lights on, officers behind them.

const NAVY = '#16203a';

/** The road edge to block: 70 to 130 m ahead of (x, z) within ~35 degrees of `heading`, or null. */
export function pickRoadblockEdge(graph, x, z, heading) {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  let best = null;
  let bestScore = Infinity;
  for (const edge of graph.edges) {
    if (edge.length < 30 || edge.width < 9 || edge.kind === 'causeway') continue;
    const a = graph.nodes[edge.from];
    const b = graph.nodes[edge.to];
    const mx = (a.x + b.x) / 2 - x;
    const mz = (a.z + b.z) / 2 - z;
    const d = Math.hypot(mx, mz);
    if (d < 70 || d > 130) continue;
    const cos = (mx * fx + mz * fz) / d;
    if (cos < 0.82) continue;
    const score = Math.abs(d - 95) + (1 - cos) * 200;
    if (score < bestScore) {
      bestScore = score;
      best = edge;
    }
  }
  return best;
}

/** Manages up to `max` roadblocks built from fleet cruisers and the officer pool. */
export function createRoadblocks(fleet, officers, ground) {
  const blocks = [];

  function build(graph, edge, toward) {
    const a = graph.nodes[edge.from];
    const b = graph.nodes[edge.to];
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const across = { x: -edge.dirZ, z: edge.dirX };
    const away = Math.sign((mx - toward.x) * edge.dirX + (mz - toward.z) * edge.dirZ) || 1;
    const block = { cars: [], officers: [], x: mx, z: mz, age: 0 };
    [-1, 1].forEach((side, index) => {
      const car = fleet.reuse('cruiser', NAVY);
      if (!car) return;
      const x = mx + across.x * side * edge.width * 0.24;
      const z = mz + across.z * side * edge.width * 0.24;
      car.position.set(x, ground.surfaceAt(x, z).height, z);
      car.heading = Math.atan2(across.x, across.z) + (index ? 0.35 : -0.35);
      car.pitch = 0;
      car.roll = 0;
      car.lightsOn = true;
      car.flashPhase = index * 0.21;
      car.police = true;
      block.cars.push(car);
      const ox = x + edge.dirX * away * 3.2;
      const oz = z + edge.dirZ * away * 3.2;
      const officer = officers.deploy(ox, oz, Math.atan2(-edge.dirX * away, -edge.dirZ * away),
        index ? 'shotgun' : 'pistol');
      if (officer) block.officers.push(officer);
    });
    blocks.push(block);
    return block;
  }

  function clear(block) {
    for (const car of block.cars) {
      car.visible = false;
      car.spare = true;
      car.lightsOn = false;
    }
    blocks.splice(blocks.indexOf(block), 1);
  }

  return {
    blocks,
    /** Keep `wanted` roadblocks near a driving target {x, z, heading}; clear stale ones. */
    update(dt, graph, target, wanted, driving) {
      for (const block of [...blocks]) {
        block.age += dt;
        const d = Math.hypot(block.x - target.x, block.z - target.z);
        if (d > 220 || block.age > 70 || wanted === 0) clear(block);
      }
      if (!driving || blocks.length >= wanted) return;
      const edge = pickRoadblockEdge(graph, target.x, target.z, target.heading);
      if (edge && !blocks.some((block) => Math.hypot(block.x - target.x, block.z - target.z) < 140)) {
        build(graph, edge, target);
      }
    },
    clearAll() {
      for (const block of [...blocks]) clear(block);
    },
    build,
  };
}
