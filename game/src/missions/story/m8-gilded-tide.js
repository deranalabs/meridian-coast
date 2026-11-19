// Mission 8, "Gilded Tide": the heist. Drive the linen van into the Aurelio service lane, drop the guards, hold
// the lance on Gus's vault door against the clock and a second wave, then break Solis's dragnet and its
// helicopter and reach Benny's boat at Gull Key with no tail. Every phase is a checkpoint.

const LINEN_WHITE = '#eef2f0';
const VAULT_SECONDS = 30;

/** A spot `along` the kerb and `out` from a place, in metres. */
function near(kit, id, along, out) {
  const p = kit.places.get(id);
  return { x: p.x - p.outZ * along + p.outX * out, z: p.z + p.outX * along + p.outZ * out };
}

/** The van at the bay for the start or in the lane after it; the door; the guards and the wave from the hotel. */
function setup(kit, stage) {
  const props = kit.scope();
  if (stage === 0) {
    props.actor('nell', 'lockup-bay', { offset: 2.5 });
    props.car('linen-van', 'pickup', LINEN_WHITE, near(kit, 'lockup-bay', 5, 5), kit.places.get('lockup-bay').heading);
  } else {
    props.car('linen-van', 'pickup', LINEN_WHITE, near(kit, 'aurelio-lane', 7, 4.5),
      kit.places.get('aurelio-lane').heading);
  }
  props.vaultDoor('aurelio-lane', { seconds: VAULT_SECONDS });
  const guards = stage <= 1
    ? [near(kit, 'aurelio-lane', -6, 3), near(kit, 'aurelio-lane', -2, 6), near(kit, 'aurelio-lane', 3, 7),
      near(kit, 'aurelio-lane', 11, 3)] : null;
  if (guards) props.crew('guards', guards, { faction: 'gildedWake', hp: 50, range: 26, rate: 1.4 });
  let wave = null;
  props.onStage = (index) => {
    if (index !== 2 || wave) return;
    wave = props.crew('wave', [near(kit, 'aurelio-lane', -16, 6), near(kit, 'aurelio-lane', 16, 6),
      near(kit, 'aurelio-lane', 20, 2)], { faction: 'gildedWake', hp: 40, range: 40, rate: 1.9 });
  };
  props.onPassed = () => {
    props.focus = kit.point('gull-dock');
  };
  return props;
}

export const GILDED_TIDE = Object.freeze({
  id: 'gilded-tide',
  number: 8,
  title: 'Gilded Tide',
  giver: 'nell',
  requires: ['tide-tables'],
  startAt: 'lockup-bay',
  colour: '#ff8a5c',
  heist: true,
  car: 'linen-van',
  reward: { cash: 40000, respect: 60 },
  outfit: ['linen-shell', 'linen-cap', 'linen-slacks'],
  intro: [
    ['nell', 'Thursday. Priya has the road, Tavi has the power, Benny has the boat. You have the lance.'],
    ['tavi', 'Lights go out in the lane the moment you pull in. Ninety seconds of dark, then the hotel wakes up.'],
    ['ilo', 'And you, Nell?'],
    ['nell', 'I have the phone. I will tell you when to run.'],
  ],
  stages: [
    {
      type: 'drive', car: 'linen-van', at: 'aurelio-lane', radius: 10,
      text: 'Drive the linen van into the Aurelio service lane', next: 'Drop the guards at the door',
      talk: [['priya', 'Laundry speed, Rask. Laundry vans do not race.']],
    },
    {
      type: 'defeat', group: 'guards', checkpoint: true, start: 'aurelio-lane', quiet: true,
      text: 'Entry: drop Gus\'s guards at the service door', next: 'Cut the vault door before the hotel wakes',
      talk: [['tavi', 'Power is off. Go, go, go.']],
    },
    {
      type: 'deliver', at: 'aurelio-lane', radius: 6, wait: VAULT_SECONDS, limit: 80, onFoot: true,
      checkpoint: true, start: 'aurelio-lane', quiet: true,
      text: 'Vault: hold the lance on the door until it gives', next: 'Escape the dragnet in the van',
      talk: [['juno', 'Breaking news on Talk Meridian: shots at the Hotel Aurelio. Police are on their way.'],
        ['ilo', 'Juno. Of course. Nell sold this to Juno too.']],
    },
    {
      type: 'evade', alert: 4, checkpoint: true, start: 'aurelio-lane',
      text: 'Escape: Solis has the lane boxed in. Lose four stars', next: 'Reach Benny\'s boat at Gull Key',
      talk: [['solis', 'All units, Aurelio lane. Laundry van. Everyone in it goes in cuffs. Everyone.'],
        ['ilo', 'So much for the clean record.']],
    },
    {
      type: 'deliver', car: 'linen-van', at: 'gull-dock', radius: 9, wait: 2, clean: true,
      text: 'Bring the van to Benny at the Gull Key dock with no tail',
    },
  ],
  outro: [
    ['benny', 'Forty grand for Gus, and the rest for the boat fund. Get the bags under the tarp.'],
    ['ilo', 'Where is Nell?'],
    ['benny', 'On Solis\'s phone, telling her you went north. She thinks you are still in the vault.'],
    ['ilo', 'Then Gus gets paid, Solis gets Voss\'s ledger, and Nell gets nothing. Tide is turning, Benny.'],
  ],
  setup,
});
