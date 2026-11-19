// Mission failures: the mission-wide checks (death, arrest, a wrecked mission car, walking away) and their lines.

/** What the failed screen says for each reason. */
export const FAIL_TEXT = Object.freeze({
  dead: 'Ilo went down',
  caught: 'Ilo was arrested',
  'car-destroyed': 'The car was wrecked',
  'too-far': 'You lost them',
  spotted: 'You got too close and they made you',
  abandoned: 'You walked away from the job',
  'target-lost': 'The target got away',
  quit: 'You called the job off',
  heat: 'You brought the police with you',
});

/** The text for a reason, with a fallback for unknown ones. */
export const failText = (reason) => FAIL_TEXT[reason] ?? 'The job went wrong';

/**
 * Check the failures that hold for the whole mission. `def.car` names a car the mission depends on;
 * `def.leash` ({at, metres}) fails the job when the player wanders off before it starts.
 * Returns a reason or null.
 */
export function checkFailures(def, stage, view) {
  if (view.dead) return 'dead';
  if (view.busted) return 'caught';
  if (stage.noWanted && view.stars > 0) return 'heat';
  const tag = stage.car ?? def.car;
  if (tag && view.cars?.[tag] && view.cars[tag].health <= 0) return 'car-destroyed';
  const leash = stage.leash;
  if (leash && Math.hypot(view.x - leash.at.x, view.z - leash.at.z) > leash.metres) return 'abandoned';
  if (stage.target && view.targets?.[stage.target]?.lost) return 'target-lost';
  return null;
}
