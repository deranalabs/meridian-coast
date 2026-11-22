// Dispatch report: turns the live police state into radio rows (call sign, distance, what it is doing) for the HUD.

/** Port Meridian PD radio names; a cruiser's call sign comes from its fleet slot so it stays the same all chase. */
export const CALL_NAMES = Object.freeze(['Cobalt', 'Marlin', 'Palmetto', 'Lantern', 'Harbor', 'Solano', 'Pelican']);

/** Everything a unit can be doing, as the word on its chip. */
export const JOBS = Object.freeze({
  ramming: 'RAMMING',
  flanking: 'FLANKING',
  cuttingOff: 'CUTTING OFF',
  onFoot: 'ON FOOT',
  spotlight: 'SPOTLIGHT',
  overhead: 'OVERHEAD',
  roadblock: 'ROADBLOCK',
  searching: 'SEARCHING',
  returning: 'RETURNING',
});

/** The job of each pursuit role in pursuit.js, which drives an unknown role as a rammer. */
const ROLE_JOB = Object.freeze({
  ram: JOBS.ramming, left: JOBS.flanking, right: JOBS.flanking, block: JOBS.cuttingOff,
});

/** A job as the key of its chip colour: 'CUTTING OFF' becomes 'cutting-off'. */
export const jobKey = (job) => job.toLowerCase().replaceAll(' ', '-');

/** A car going back is only returning; otherwise officers out outrank a search, and a search outranks the role. */
function carJob(unit) {
  if (unit.mode === 'leave') return JOBS.returning;
  if (unit.officersOut) return JOBS.onFoot;
  if (unit.mode === 'search') return JOBS.searching;
  return ROLE_JOB[unit.driver?.role] ?? JOBS.ramming;
}

/** "2-Cobalt-31": district division, radio name and unit number, all from the car's slot. */
export function callSign(index) {
  const i = Math.max(0, index | 0);
  const division = 1 + (i % 4);
  const name = CALL_NAMES[(i * 3) % CALL_NAMES.length];
  const number = 11 + ((i * 17) % 78);
  return `${division}-${name}-${number}`;
}

/** policeReport(police, x, z) → { rows, cars, officers, responding, nearest }; rows sorted nearest first. */
export function policeReport(police, x, z) {
  const rows = [];
  const metresTo = (px, pz) => Math.round(Math.hypot(px - x, pz - z));
  for (const unit of police.units.units) {
    rows.push({
      call: callSign(unit.car?.index ?? rows.length),
      kind: 'car',
      metres: metresTo(unit.vehicle.x, unit.vehicle.z),
      job: carJob(unit),
    });
  }
  const air = police.helicopter?.state;
  if (air?.active) {
    rows.push({
      call: 'Air-1 Gull',
      kind: 'air',
      metres: metresTo(air.x, air.z),
      job: air.spot ? JOBS.spotlight : JOBS.overhead,
    });
  }
  for (const block of police.roadblocks?.blocks ?? []) {
    rows.push({ call: 'Roadblock', kind: 'block', metres: metresTo(block.x, block.z), job: JOBS.roadblock });
  }
  rows.sort((a, b) => a.metres - b.metres);
  const officers = police.officers.pool.filter((o) => o.active && !o.down).length;
  // Responding: every row still on the call (car, helicopter, roadblock) plus each officer on foot.
  const responding = rows.filter((row) => row.job !== JOBS.returning).length + officers;
  return { rows, cars: police.units.units.length, officers, responding, nearest: rows.length ? rows[0].metres : null };
}
