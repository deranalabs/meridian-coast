// Side activity "Rask Cabs": a repeatable taxi job in Tavi's yellow sedan; pick a fare up, beat the meter to
// the drop, and the time left on the meter comes back as a tip. Each fresh shift takes the next fare in line.

const CAB_YELLOW = '#ffd23f';
const METER = 90;
const TIP_PER_SECOND = 4;

/** Pick-up and drop pairs, by story place id; shifts walk through them in order. */
export const FARES = Object.freeze([
  ['newsbox', 'pell-hotel'],
  ['pier-nine', 'solis-steps'],
  ['voss-yard', 'lantern'],
  ['bluff', 'cold-store'],
  ['pell-hotel', 'gull-dock'],
  ['solis-steps', 'linen-depot'],
]);

/** The tip for `seconds` left on the meter. */
export const tipFor = (seconds) => Math.max(0, Math.round(seconds * TIP_PER_SECOND));

let shift = -1;

/** The cab at the rank, the fare's pick-up and drop as moving targets, and the meter for the tip. */
function setup(kit, stage, restart) {
  const props = kit.scope();
  if (stage === 0 && !restart) shift += 1;
  const [from, to] = FARES[shift % FARES.length];
  const rank = kit.places.get('cab-rank');
  props.car('cab', 'sedan', CAB_YELLOW, { x: rank.x + rank.outX * 4, z: rank.z + rank.outZ * 4 }, rank.heading);
  props.targets.fare = { ...kit.point(from) };
  props.targets.drop = { ...kit.point(to) };
  let current = stage;
  let meter = 0;
  props.onStage = (index) => {
    current = index;
    meter = 0;
  };
  const step = props.update;
  props.update = (dt, view) => {
    step?.(dt, view);
    if (current === 2) meter += dt;
  };
  props.bonus = () => tipFor(METER - meter);
  props.onPassed = () => {
    props.focus = props.cars.cab?.car.position ?? kit.point(to);
  };
  return props;
}

export const RASK_CABS = Object.freeze({
  id: 'rask-cabs',
  number: 102,
  title: 'Rask Cabs',
  giver: 'tavi',
  activity: true,
  repeat: true,
  requires: ['lantern-run'],
  startAt: 'cab-rank',
  colour: CAB_YELLOW,
  car: 'cab',
  reward: { cash: 250, respect: 3 },
  intro: [['tavi', 'Cab is yours for the shift. Fare is marked. Beat the meter and they tip.']],
  stages: [
    { type: 'steal', car: 'cab', text: 'Get in the Rask Cabs sedan', next: 'Pick up the fare' },
    { type: 'drive', car: 'cab', target: 'fare', radius: 8, text: 'Pick up the fare at the gold marker',
      next: 'Beat the meter to the drop' },
    { type: 'drive', car: 'cab', target: 'drop', radius: 8, limit: METER,
      text: 'Get the fare to the drop before the meter runs out' },
  ],
  outro: [['tavi', 'Fare paid, tip in the jar. Same time tomorrow, cousin.']],
  setup,
});
