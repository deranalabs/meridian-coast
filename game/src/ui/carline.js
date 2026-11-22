// The line by the speedometer: which car this is and how Ilo stands with it, from flags the car already carries.

/** The label of each car a job names, by the mission tag it carries. */
export const JOB_CAR_NAMES = Object.freeze({
  'voss-coupe': 'Voss Freight coupe',
  prize: 'Gold coupe',
  'dex-van': "Dex's van",
  'linen-van': 'Linen van',
  cab: 'Rask Cabs sedan',
});

/**
 * A job's claim on a car comes first. Then `owned` (garage, dealer or spray bay: taking it is no crime), and any
 * other car is stolen, as action.js reports it the moment Ilo takes it.
 */
function standingOf(car) {
  if (car.missionTag === 'cab') return 'Cab';
  if (car.missionTag) return 'Job car';
  return car.owned ? 'Yours' : 'Stolen';
}

/** carLine(car) → { name, standing } for the car Ilo drives, or null on foot. */
export function carLine(car) {
  if (!car) return null;
  return { name: JOB_CAR_NAMES[car.missionTag] ?? car.spec.name, standing: standingOf(car) };
}
