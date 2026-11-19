// Mission 7, "Tide Tables": the heist set-up. Scout the Hotel Aurelio and its service lane on foot, steal the
// Seabright Linen van and lose the depot alarm, then buy the thermal lance and the crew's masks in town.

const LINEN_WHITE = '#eef2f0';

/** Nell at the Lantern for the briefing; the vault door already stands in the lane; the van waits at the depot. */
function setup(kit, stage) {
  const props = kit.scope();
  if (stage === 0) props.actor('nell', 'lantern');
  props.vaultDoor('aurelio-lane', { seconds: 9999 });
  if (stage <= 3) {
    const depot = kit.places.get('linen-depot');
    props.car('linen-van', 'pickup', LINEN_WHITE, { x: depot.x + depot.outX * 4, z: depot.z + depot.outZ * 4 },
      depot.heading ?? 0);
  }
  props.onPassed = () => {
    props.focus = kit.point('clothes');
  };
  return props;
}

export const TIDE_TABLES = Object.freeze({
  id: 'tide-tables',
  number: 7,
  title: 'Tide Tables',
  giver: 'nell',
  requires: ['tarp-run'],
  startAt: 'lantern',
  colour: '#c45cff',
  reward: { cash: 4500, respect: 30 },
  intro: [
    ['nell', 'Gus keeps forty years of other people\'s money in a vault under the Aurelio. Thursday it is full.'],
    ['ilo', 'And you want it emptied.'],
    ['nell', 'I want it planned. Walk the front, walk the service lane, steal us a laundry van, buy the tools.'],
    ['ilo', 'Who is on the crew?'],
    ['nell', 'You, Tavi, Priya driving, Benny at the dock. And me, on the phone, where it is warm.'],
  ],
  stages: [
    {
      type: 'goto', at: 'pell-hotel', radius: 5, onFoot: true, noWanted: true,
      text: 'Scout the front of the Hotel Aurelio on foot', next: 'Case the service lane',
      talk: [['nell', 'Two doormen, one camera. Do not look at the camera.']],
    },
    {
      type: 'deliver', at: 'aurelio-lane', radius: 6, wait: 3, onFoot: true, noWanted: true,
      text: 'Case the service lane and its vault door', next: 'Steal the Seabright Linen van',
      talk: [['ilo', 'A drum door, eight bolts. A lance will take half a minute. A long half minute.']],
    },
    {
      type: 'steal', car: 'linen-van', checkpoint: true, start: 'linen-depot',
      text: 'Steal the Seabright Linen van from the depot', next: 'Lose the alarm and bring it to Tavi',
      talk: [['nell', 'The laundry goes in through the lane every night. Nobody stops the laundry.']],
    },
    {
      type: 'deliver', car: 'linen-van', at: 'lockup-bay', radius: 9, wait: 1.5, clean: true, alert: 1,
      text: 'The depot called it in. Lose it and park the van at Tavi\'s bay', next: 'Buy the thermal lance',
    },
    {
      type: 'buy', item: 'gear:cutter', at: 'gun', checkpoint: true, start: 'lockup-bay',
      text: 'Buy the thermal lance at Halcyon Arms', next: 'Buy the crew\'s masks',
      talk: [['tavi', 'The van is in. Ask for the lance by name, they keep it under the counter.']],
    },
    {
      type: 'buy', item: 'gear:masks', at: 'clothes',
      text: 'Pick up the gull masks at Saltwater Threads',
    },
  ],
  outro: [
    ['nell', 'Lance, masks, van. Thursday, then. You go in, you cut, you come out. Simple.'],
    ['ilo', 'Simple. Dex says you mean to leave me in the vault.'],
    ['nell', 'Dex says a lot of things from under a tarp. Be at Tavi\'s bay at dusk.'],
  ],
  setup,
});
