// Story plot: who wants what in Port Meridian, and the beats of the six missions and the heist, as plain data.

/** The debt that drives the story, and the people who pull Ilo along. */
export const PREMISE = Object.freeze({
  debt: 40000,
  creditor: 'gus',
  line: 'Ilo Rask owes Gus Pell forty grand. Gus adds interest daily. Nell has work. Voss has the harbour. '
    + 'Captain Solis wants a headline, and someone in this town is going to be it.',
});

/** What each cast member wants from Ilo, and the turn they take. */
export const MOTIVES = Object.freeze({
  nell: { wants: 'a runner she can trust', turn: 'quietly sells Gus the route of every job' },
  gus: { wants: 'his forty grand, plus whatever he can squeeze', turn: 'puts Ilo on Voss to start a war' },
  voss: { wants: 'nobody touching the quay', turn: 'hires Ilo to hit Gus once he learns who sent him' },
  solis: { wants: 'one big arrest before the election', turn: 'offers Ilo a pass if he hands her Voss' },
  tavi: { wants: 'the lock-up to stay open', turn: 'none: family first' },
  dex: { wants: 'out from under Voss', turn: 'flips and feeds Ilo the van routes' },
  priya: { wants: 'the Calder Crew paid and respected', turn: 'joins the heist for a full share' },
  juno: { wants: 'a story nobody else has', turn: 'puts the heist on air a day too early' },
  benny: { wants: 'fuel money and no questions', turn: 'none: he only drives the boat' },
});

/** The story in order: missions 1 to 6 and the heist, each a beat, its giver, its places and its pay. */
export const BEATS = Object.freeze([
  {
    number: 1, id: 'lantern-run', title: 'Lantern Run', giver: 'nell', places: ['lantern', 'newsbox', 'pell-hotel'],
    beat: 'Nell tests Ilo with a sealed parcel: pick it up from the Coral Street kiosk and walk it to Gus as a '
      + 'first payment. Couriers do not bring the police to the door.',
    shapes: ['goto', 'deliver'], reward: { cash: 1200, respect: 10 }, outfit: 'courier',
  },
  {
    number: 2, id: 'salt-and-chrome', title: 'Salt and Chrome', giver: 'tavi', places: ['lockup-bay', 'voss-yard'],
    beat: 'Gus wants collateral on what Voss owes him: the Voss Freight coupe. Tavi will make it vanish, if Ilo '
      + 'can bring it home without a tail.',
    shapes: ['steal', 'evade', 'drive'], reward: { cash: 2200, respect: 15 },
  },
  {
    number: 3, id: 'white-van', title: 'White Van', giver: 'juno', places: ['lantern', 'pier-nine', 'cold-store'],
    beat: 'Juno heard Dex runs a van off Pier Nine every night. Tail it to the drop, keep your distance, and '
      + 'break the Salt Dogs escort so Gus can see what Voss is moving.',
    shapes: ['follow', 'defeat', 'goto'], reward: { cash: 3000, respect: 20 },
  },
  {
    number: 4, id: 'headline', title: 'Headline', giver: 'solis', places: ['solis-steps', 'voss-yard'],
    beat: 'Captain Solis knows about the van. She offers a clean record for a camera planted in Voss\'s office.',
    shapes: ['goto', 'deliver', 'evade'], reward: { cash: 2500, respect: 20 },
  },
  {
    number: 5, id: 'hill-favour', title: 'Hill Favour', giver: 'priya', places: ['bluff', 'garage'],
    beat: 'Priya pays Tavi\'s debt in kind: Ilo races her crew down the switchbacks, and the winner keeps the car.',
    shapes: ['drive', 'defeat'], reward: { cash: 3500, respect: 25 },
  },
  {
    number: 6, id: 'tarp-run', title: 'Tarp Run', giver: 'benny', places: ['gull-dock', 'pier-nine'],
    beat: 'Dex flips and wants out; Benny takes him to Gull Key under a tarp while Voss\'s men search the piers.',
    shapes: ['goto', 'follow', 'defeat'], reward: { cash: 4000, respect: 30 },
  },
  {
    number: 7, id: 'gilded-tide', title: 'Gilded Tide', giver: 'nell', places: ['pell-hotel', 'gull-dock'], heist: true,
    beat: 'The heist: Gus\'s vault under the Hotel Aurelio. Nell plans it, Priya drives, Tavi cuts the power, '
      + 'Benny waits at the dock. Juno breaks it on air early and Solis comes for everyone.',
    shapes: ['goto', 'defeat', 'evade', 'drive'], reward: { cash: 40000, respect: 60 },
  },
]);

/** The betrayals, in the order they land. */
export const BETRAYALS = Object.freeze([
  { by: 'nell', of: 'ilo', when: 4, how: 'She has been selling Gus every route Ilo runs.' },
  { by: 'dex', of: 'voss', when: 6, how: 'He hands Ilo the van routes and the yard keys.' },
  { by: 'solis', of: 'ilo', when: 7, how: 'The clean record was never real; she wants the heist crew in cuffs.' },
]);
