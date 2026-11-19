// Mission 2, "Salt and Chrome": steal the Voss Freight coupe, shake the police it brings, deliver it to Tavi.

const COUPE_SILVER = '#c9ced6';
const KERB_OUT = 4.5;

/** Tavi at the bay, and the coupe parked on the street outside the freight yard. */
function setup(kit) {
  const props = kit.scope();
  props.actor('tavi', 'lockup-bay');
  const yard = kit.places.get('voss-yard');
  const spot = { x: yard.x + yard.outX * KERB_OUT, z: yard.z + yard.outZ * KERB_OUT };
  props.car('voss-coupe', 'coupe', COUPE_SILVER, spot, yard.heading ?? 0);
  return props;
}

export const SALT_AND_CHROME = Object.freeze({
  id: 'salt-and-chrome',
  number: 2,
  title: 'Salt and Chrome',
  giver: 'tavi',
  requires: ['lantern-run'],
  startAt: 'lockup-bay',
  colour: '#2ec4c9',
  car: 'voss-coupe',
  reward: { cash: 2200, respect: 15 },
  intro: [
    ['tavi', 'Cousin. Gus called. He wants collateral on what Voss owes him.'],
    ['ilo', 'Collateral meaning what?'],
    ['tavi', 'Meaning the silver coupe Voss parks outside his freight yard. Every night, same spot.'],
    ['ilo', 'Voss has half the harbour watching that street.'],
    ['tavi', 'And the yard has a panic line to the precinct. Lose the cruisers, then bring it here. In one piece.'],
  ],
  stages: [
    {
      type: 'steal', car: 'voss-coupe', text: 'Steal the Voss Freight coupe outside the yard',
      next: 'Lose the police it brings',
      talk: [['tavi', 'Silver coupe, harbour plates. You cannot miss it.']],
    },
    {
      type: 'evade', car: 'voss-coupe', alert: 2, text: 'The yard called it in. Lose the police',
      next: "Bring the coupe to Tavi's bay",
      talk: [['tavi', 'There it is, the panic line. Side streets, cousin. Break their sight and keep moving.']],
    },
    {
      type: 'drive', car: 'voss-coupe', at: 'lockup-bay', radius: 7,
      text: "Bring the coupe to Tavi's bay",
      talk: [['tavi', 'Clean. Bring it home slow. Scratches cost me hours.']],
    },
  ],
  outro: [
    ['tavi', 'Look at her. New plates, new paint by sunrise. Voss will never see this car again.'],
    ['ilo', 'Gus gets the papers, we get paid?'],
    ['tavi', 'Gus gets the papers. We get paid. Voss gets angry. Two out of three is a good night.'],
  ],
  setup,
});
