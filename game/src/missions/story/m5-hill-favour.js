// Mission 5, "Hill Favour": race Priya's driver down from Calder Bluff to the Brinewater quay for Tavi's debt,
// survive the Velvet Hand crew Nell sent to the finish line, and bring the prize coupe home to Tavi's bay.

const CALDER_GOLD = '#f2b84b';
const RIVAL_RED = '#d8432e';

/** Three Velvet Hand shooters fanned out past the finish line. */
function ambushSpots(kit) {
  const quay = kit.places.get('cold-store');
  const along = { x: -quay.outZ, z: quay.outX };
  return [[-8, 6], [0, 9], [9, 5]].map(([a, out]) => ({
    x: quay.x + along.x * a + quay.outX * out,
    z: quay.z + along.z * a + quay.outZ * out,
  }));
}

/** Priya and the prize coupe at the bluff, the course to the quay, the ambush once the race is won. */
function setup(kit, stage) {
  const props = kit.scope();
  const bluff = kit.places.get('bluff');
  if (stage <= 1) {
    props.actor('priya', 'bluff', { offset: 3 });
    props.car('prize', 'coupe', CALDER_GOLD, { x: bluff.x + bluff.outX * 7, z: bluff.z + bluff.outZ * 7 },
      bluff.heading ?? 0);
  } else {
    const quay = kit.places.get('cold-store');
    props.car('prize', 'coupe', CALDER_GOLD, { x: quay.x + quay.outX * 5, z: quay.z + quay.outZ * 5 },
      quay.heading ?? 0);
  }
  const course = stage <= 1 ? props.course('downhill', { from: 'bluff', to: 'cold-store', spacing: 80,
    rival: { type: 'coupe', colour: RIVAL_RED, speed: 21 } }) : null;
  let crew = null;
  const ambush = () => {
    crew ??= props.crew('velvet', ambushSpots(kit), { faction: 'velvetHand', hp: 40, range: 30, rate: 1.6 });
  };
  if (stage === 2) ambush();
  props.onStage = (index) => {
    if (index === 1) course?.start();
    if (index === 2) ambush();
  };
  props.onPassed = () => {
    props.focus = props.cars.prize?.car.position ?? kit.point('lockup-bay');
  };
  return props;
}

export const HILL_FAVOUR = Object.freeze({
  id: 'hill-favour',
  number: 5,
  title: 'Hill Favour',
  giver: 'priya',
  requires: ['headline'],
  startAt: 'bluff',
  colour: CALDER_GOLD,
  reward: { cash: 3500, respect: 25 },
  car: 'prize',
  intro: [
    ['priya', 'Tavi owes my crew six grand and a gearbox. You are going to pay it with your driving.'],
    ['ilo', 'And if I lose?'],
    ['priya', 'Then Tavi owes twelve. The gold coupe is yours for the race. Win, and it stays yours.'],
    ['priya', 'Bluff to the Brinewater quay, through every gate. My driver does not brake.'],
  ],
  stages: [
    {
      type: 'steal', car: 'prize', text: 'Get in the gold coupe', next: 'Race to the quay through every gate',
      talk: [['priya', 'Mind the paint. It is older than you.']],
    },
    {
      type: 'race', target: 'downhill', car: 'prize', inCar: true, limit: 140,
      text: 'Race down to the quay. Beat Priya\'s driver through every gate',
      next: 'Something is waiting at the finish',
      talk: [['priya', 'Three, two... he never waits for one.']],
    },
    {
      type: 'defeat', group: 'velvet', checkpoint: true, start: 'cold-store',
      text: 'Velvet Hand shooters at the finish. Nell sent them. Drop them all',
      next: 'Bring the coupe home to Tavi',
      talk: [['ilo', 'Purple jackets. Nell\'s people. Solis was right.']],
    },
    {
      type: 'drive', car: 'prize', at: 'lockup-bay', radius: 9, text: 'Bring the gold coupe to Tavi\'s bay',
    },
  ],
  outro: [
    ['tavi', 'You won it? You actually won Priya\'s coupe? I am crying. Look, real tears.'],
    ['ilo', 'Your debt is clear. And Nell is selling us out.'],
    ['tavi', 'Then we stop telling Nell things. Benny called, by the way. Dex Marrow wants out of town. Tonight.'],
  ],
  setup,
});
