// Mission 3, "White Van": tail Dex's van from Pier Nine to the cold store, then break the Salt Dogs escort.

const VAN_WHITE = '#f2f2f2';

/** Three escort spots along the kerb outside the cold store, a little away from its door. */
function escortSpots(kit) {
  const store = kit.places.get('cold-store');
  const along = { x: -store.outZ, z: store.outX };
  return [[9, 3], [12, 5.5], [15, 2.5]].map(([a, out]) => ({
    x: store.x + along.x * a + store.outX * out,
    z: store.z + along.z * a + store.outZ * out,
  }));
}

/** Juno for the briefing; the escort waits at the cold store; the van rolls when Ilo reaches the gate. */
function setup(kit, stage) {
  const props = kit.scope();
  if (stage === 0) props.actor('juno', 'lantern');
  props.crew('escort', escortSpots(kit), { faction: 'saltDogs', hp: 40, range: 24, rate: 1.7 });
  let van = null;
  props.onStage = (index) => {
    if (index !== 1 || van) return;
    van = props.convoy('van', { type: 'pickup', colour: VAN_WHITE, from: 'pier-nine', to: 'cold-store', speed: 10,
      wait: 1.2, slowWhenBehind: 60 });
  };
  props.onPassed = () => {
    props.focus = van?.car.position ?? kit.point('cold-store');
  };
  return props;
}

export const WHITE_VAN = Object.freeze({
  id: 'white-van',
  number: 3,
  title: 'White Van',
  giver: 'juno',
  requires: ['salt-and-chrome'],
  startAt: 'lantern',
  colour: '#ffd166',
  reward: { cash: 3000, respect: 20 },
  intro: [
    ['juno', 'You are the one who took Voss\'s coupe. The whole harbour is talking. Off air, naturally.'],
    ['ilo', 'Naturally. What do you want, Juno?'],
    ['juno', 'A story. Dex Marrow drives a white van out of Pier Nine every night, same hour, escort at the end.'],
    ['ilo', 'And Gus would love to know what is in it.'],
    ['juno', 'Tail it, keep back, find out. Gus gets his answer, I get my scoop, you get paid. Everybody sleeps.'],
  ],
  stages: [
    {
      type: 'drive', at: 'pier-nine', radius: 16, text: 'Get a car and wait by the Pier Nine gate',
      next: "Tail Dex's van without being seen",
      talk: [['juno', 'Any car will do. Something boring is better.']],
    },
    {
      type: 'follow', target: 'van', min: 12, max: 110, closeGrace: 5,
      text: "Tail Dex's van. Hang back, he checks his mirrors",
      next: 'Deal with the escort at the drop',
      talk: [['juno', 'There he goes. Not too close, Ilo. Dex used to box; he notices things.']],
    },
    {
      type: 'defeat', group: 'escort', checkpoint: true, start: 'cold-store',
      text: 'The Salt Dogs escort is waiting. Take them out',
      next: 'Check the cargo at the cold store door',
      talk: [['ilo', 'Three of them. Of course there are three of them.']],
    },
    {
      type: 'goto', at: 'cold-store', radius: 4.5, onFoot: true,
      text: 'Check the cargo at the cold store door',
      talk: [['juno', 'Talk to me. What is in the van?']],
    },
  ],
  outro: [
    ['ilo', 'Ice chests. Full of harbour permits, stamped and signed. Hundreds of them.'],
    ['juno', 'Forged? No. Real ones. Somebody at the precinct is signing for Voss.'],
    ['ilo', 'Gus is going to love this.'],
    ['juno', 'Gus is going to use this. Be careful whose war you are carrying, Ilo.'],
  ],
  setup,
});
