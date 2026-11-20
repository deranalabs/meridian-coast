// Dispatch report: turns the live police state into radio-style rows (call sign, job, distance, state) for the HUD.

/** Port Meridian PD radio names; a cruiser's call sign comes from its fleet slot so it stays the same all chase. */
export const CALL_NAMES = Object.freeze(['Cobalt', 'Marlin', 'Palmetto', 'Lantern', 'Harbor', 'Solano', 'Pelican']);

/** What each pursuit role does, in dispatch words. */
export const ROLE_DETAIL = Object.freeze({ ram: 'Ram', left: 'Flank left', right: 'Flank right', block: 'Cut off' });
/** The same jobs in at most seven letters, so a HUD row never has to cut them short. */
export const ROLE_BRIEF = Object.freeze({ ram: 'Ram', left: 'Flank L', right: 'Flank R', block: 'Cut off' });

/** Unit mode to the state word on the panel. */
export const MODE_STATE = Object.freeze({ pursue: 'Pursuit', search: 'Search', leave: 'Return' });

/** "2-Cobalt-31": district division, radio name and unit number, all from the car's slot. */
export function callSign(index) {
  const i = Math.max(0, index | 0);
  const division = 1 + (i % 4);
  const name = CALL_NAMES[(i * 3) % CALL_NAMES.length];
  const number = 11 + ((i * 17) % 78);
  return `${division}-${name}-${number}`;
}

/** policeReport(police, x, z) → { rows, cars, officers, nearest }; rows sorted nearest first. */
export function policeReport(police, x, z) {
  const rows = [];
  const metresTo = (px, pz) => Math.round(Math.hypot(px - x, pz - z));
  for (const unit of police.units.units) {
    const onFoot = unit.officersOut && unit.mode !== 'leave';
    rows.push({
      call: callSign(unit.car?.index ?? rows.length),
      kind: 'car',
      detail: onFoot ? 'Officers out' : ROLE_DETAIL[unit.driver?.role] ?? 'Patrol',
      brief: onFoot ? 'On foot' : ROLE_BRIEF[unit.driver?.role] ?? 'Patrol',
      metres: metresTo(unit.vehicle.x, unit.vehicle.z),
      state: MODE_STATE[unit.mode] ?? 'Pursuit',
    });
  }
  const air = police.helicopter?.state;
  if (air?.active) {
    rows.push({
      call: 'Air-1 Gull',
      kind: 'air',
      detail: air.spot ? 'Searchlight' : 'Overhead',
      brief: air.spot ? 'Lamp on' : 'Above',
      metres: metresTo(air.x, air.z),
      state: air.spot ? 'Eyes on' : 'Search',
    });
  }
  for (const block of police.roadblocks?.blocks ?? []) {
    const standing = block.officers.filter((o) => o.active && !o.down).length;
    rows.push({
      call: 'Roadblock',
      kind: 'block',
      detail: `${block.cars.length} cars, ${standing} out`,
      brief: `${block.cars.length} ${block.cars.length === 1 ? 'car' : 'cars'}`,
      metres: metresTo(block.x, block.z),
      state: 'Holding',
    });
  }
  rows.sort((a, b) => a.metres - b.metres);
  const officers = police.officers.pool.filter((o) => o.active && !o.down).length;
  return { rows, cars: police.units.units.length, officers, nearest: rows.length ? rows[0].metres : null };
}
