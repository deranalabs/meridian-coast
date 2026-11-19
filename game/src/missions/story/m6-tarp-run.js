// Mission 6, "Tarp Run": Dex Marrow turns on Voss; Ilo breaks the Salt Dogs search party at Pier Nine, takes
// Dex's van and follows Benny's truck to the Gull Key dock with the police on him, arriving with no tail.

const VAN_WHITE = '#f2f2f2';
const BENNY_TEAL = '#3fb6a8';

/** Spots around the Pier Nine gate: four searchers, and the van at the kerb. */
function pierSpot(kit, along, out) {
  const pier = kit.places.get('pier-nine');
  return { x: pier.x - pier.outZ * along + pier.outX * out, z: pier.z + pier.outX * along + pier.outZ * out };
}

/** Dex hides by his van; the Salt Dogs search the gate; Benny's truck leaves once Ilo is behind the wheel. */
function setup(kit, stage) {
  const props = kit.scope();
  const pier = kit.places.get('pier-nine');
  if (stage <= 1) props.actor('dex', 'pier-nine', { offset: 2.5 });
  props.car('dex-van', 'pickup', VAN_WHITE, pierSpot(kit, 6, 5), pier.heading ?? 0);
  if (stage <= 1) {
    props.crew('search', [pierSpot(kit, -14, 5), pierSpot(kit, -9, 9), pierSpot(kit, 13, 8), pierSpot(kit, 18, 3)],
      { faction: 'saltDogs', hp: 45, range: 28, rate: 1.5 });
  }
  let truck = null;
  const roll = () => {
    truck ??= props.convoy('benny', { type: 'pickup', colour: BENNY_TEAL, from: 'pier-nine', to: 'gull-dock',
      speed: 14, wait: 1.5, slowWhenBehind: 50 });
  };
  props.onStage = (index) => {
    if (index === 3) roll();
  };
  props.onPassed = () => {
    props.focus = kit.point('gull-dock');
  };
  return props;
}

export const TARP_RUN = Object.freeze({
  id: 'tarp-run',
  number: 6,
  title: 'Tarp Run',
  giver: 'benny',
  requires: ['hill-favour'],
  startAt: 'gull-dock',
  colour: BENNY_TEAL,
  reward: { cash: 4000, respect: 30 },
  intro: [
    ['benny', 'Dex Marrow rang me from a phone box. A phone box, Ilo. He wants off the mainland tonight.'],
    ['ilo', 'Dex drives for Voss.'],
    ['benny', 'Drove. Says he gave Juno the van route on purpose and now Voss knows. Salt Dogs are combing Pier Nine.'],
    ['benny', 'Get him out of there. I will lead you to my boat under a tarp. Do not lose my truck.'],
  ],
  stages: [
    {
      type: 'goto', at: 'pier-nine', radius: 6, onFoot: true, text: 'Find Dex at the Pier Nine gate',
      next: 'Break the search party',
    },
    {
      type: 'defeat', group: 'search', checkpoint: true, start: 'pier-nine',
      text: 'The Salt Dogs found him first. Take down the search party', next: 'Get Dex into his van',
      talk: [['dex', 'Rask! Behind the bollards, they have pistols!']],
    },
    {
      type: 'steal', car: 'dex-van', text: 'Get Dex into his white van', next: 'Follow Benny\'s truck to the dock',
      talk: [['dex', 'Keys are in it. Voss gave me the yard keys too. They are yours, if I live.']],
    },
    {
      type: 'follow', target: 'benny', car: 'dex-van', min: 0, max: 130, alert: 2, checkpoint: true,
      start: 'pier-nine',
      text: 'Follow Benny\'s teal truck. The police are on you', next: 'Reach the dock with no tail',
      talk: [['benny', 'Sirens. Somebody called it in. Stay on me and do not stop.']],
    },
    {
      type: 'deliver', at: 'gull-dock', car: 'dex-van', radius: 9, wait: 2, clean: true,
      text: 'Lose the police and pull up at the Gull Key dock',
    },
  ],
  outro: [
    ['benny', 'Under the tarp, Dex. Lie still and think about fish.'],
    ['dex', 'Rask. Gus keeps his money under the Hotel Aurelio. The vault, not the bank. Voss pays him there.'],
    ['ilo', 'Why tell me?'],
    ['dex', 'Because Nell is planning to rob it, and she means to leave you inside.'],
  ],
  setup,
});
