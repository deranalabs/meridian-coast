// Mission 4, "Headline": plant Captain Solis's camera in Voss's yard office, shoot out of the yard, then shake
// the four-star dragnet and its helicopter that Solis sends anyway, and meet her at the precinct with no tail.

/** Four Salt Dogs spread across the yard apron, between the gate and the office door. */
function yardSpots(kit) {
  const yard = kit.places.get('voss-yard');
  const along = { x: -yard.outZ, z: yard.outX };
  return [[-6, 4], [5, 6], [10, 2.5], [-11, 7]].map(([a, out]) => ({
    x: yard.x + along.x * a + yard.outX * out,
    z: yard.z + along.z * a + yard.outZ * out,
  }));
}

/** Solis on the steps for the briefing; Voss's men turn up once the camera is in. */
function setup(kit, stage) {
  const props = kit.scope();
  if (stage === 0) props.actor('solis', 'solis-steps');
  let crew = null;
  const arrive = () => {
    crew ??= props.crew('yard', yardSpots(kit), { faction: 'saltDogs', hp: 45, range: 30, rate: 1.4 });
  };
  if (stage === 2) arrive();
  props.onStage = (index) => {
    if (index === 2) arrive();
  };
  props.onPassed = () => {
    props.focus = kit.point('solis-steps');
  };
  return props;
}

export const HEADLINE = Object.freeze({
  id: 'headline',
  number: 4,
  title: 'Headline',
  giver: 'solis',
  requires: ['white-van'],
  startAt: 'solis-steps',
  colour: '#5aa9ff',
  reward: { cash: 3200, respect: 20 },
  intro: [
    ['solis', 'Ilo Rask. Courier, car thief, and since Tuesday a man who reads harbour permits.'],
    ['ilo', 'I can explain the permits, Captain.'],
    ['solis', 'You do not need to. I want the man who signs them. Voss keeps his ledger in the yard office.'],
    ['solis', 'Put this camera above his desk. Do it, and your file gets very thin.'],
    ['ilo', 'And if his men see me?'],
    ['solis', 'Then it gets loud, and my officers will be busy elsewhere. Mostly.'],
  ],
  stages: [
    {
      type: 'goto', at: 'voss-yard', radius: 5, onFoot: true, text: 'Walk into the Voss Freight yard',
      next: 'Plant the camera in the office',
      talk: [['solis', 'Front gate. Nobody guards a yard at shift change.']],
    },
    {
      type: 'deliver', at: 'voss-yard', radius: 5, wait: 4, onFoot: true, checkpoint: true, start: 'voss-yard',
      text: 'Plant the camera above Voss\'s desk', next: 'Fight your way out of the yard',
    },
    {
      type: 'defeat', group: 'yard', checkpoint: true, start: 'voss-yard',
      text: 'Voss\'s men heard you. Shoot your way out of the yard', next: 'Lose the dragnet and the helicopter',
      talk: [['ilo', 'Shift change. Sure.']],
    },
    {
      type: 'evade', alert: 4, checkpoint: true, start: 'voss-yard',
      text: 'Solis sent the dragnet anyway. Lose four stars and Air-1',
      next: 'Meet Solis at the precinct without a tail',
      talk: [['solis', 'Nothing personal. It has to look real. Lose them and come and see me.']],
    },
    {
      type: 'deliver', at: 'solis-steps', radius: 7, wait: 2, clean: true,
      text: 'Meet Solis at the Precinct Steps without a tail',
    },
  ],
  outro: [
    ['solis', 'The camera is live. Voss signs at nine, every night. Good work.'],
    ['ilo', 'You nearly had me arrested.'],
    ['solis', 'Nearly. One more thing, for free: your fixer Nell has sold Gus every route you ran this month.'],
    ['ilo', 'Nell would not.'],
    ['solis', 'Nell already did. Ask yourself who told the yard you were coming.'],
  ],
  setup,
});
