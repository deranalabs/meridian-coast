// Police report: a plain list of the units on the player (cruisers, the helicopter, officers, roadblocks) for the HUD.

const ROLE_LABEL = { ram: 'Ram', left: 'Flank L', right: 'Flank R', block: 'Cut-off' };
const MODE_LABEL = { pursue: 'Pursuit', search: 'Search', leave: 'Clear' };
const CALL = ['Adam', 'Bravo', 'Cobalt', 'Delta', 'Echo', 'Fin'];

/** Rows for police near (x, z), nearest first: {call, kind, detail, metres, state}, plus totals. */
export function policeReport(police, x, z) {
  const rows = [];
  const dist = (px, pz) => Math.round(Math.hypot(px - x, pz - z));
  for (const unit of police.units.units) {
    const index = unit.car.index ?? rows.length;
    rows.push({
      call: `${1 + (index % 4)}-${CALL[index % CALL.length]}-${10 + ((index * 7) % 40)}`,
      kind: 'car',
      detail: ROLE_LABEL[unit.driver.role] ?? 'Unit',
      metres: dist(unit.vehicle.x, unit.vehicle.z),
      state: unit.officersOut && unit.mode !== 'leave' ? 'On foot' : MODE_LABEL[unit.mode] ?? 'Pursuit',
    });
  }
  const heli = police.helicopter.state;
  if (heli.active) {
    rows.push({ call: 'Air-1 Gull', kind: 'air', detail: 'Searchlight', metres: dist(heli.x, heli.z),
      state: heli.spot ? 'Tracking' : 'Inbound' });
  }
  for (const block of police.roadblocks.blocks) {
    rows.push({ call: 'Roadblock', kind: 'block', detail: 'Two cars', metres: dist(block.x, block.z),
      state: 'Holding' });
  }
  rows.sort((a, b) => a.metres - b.metres);
  const officers = police.officers.pool.filter((o) => o.active && !o.down).length;
  return { rows, cars: police.units.units.length, officers, nearest: rows[0]?.metres ?? null };
}
