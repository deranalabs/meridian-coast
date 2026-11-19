// Mission 1, "Lantern Run": Nell's test job. Collect a sealed parcel at the Coral Street kiosk and walk it to Gus.

/** Nell at the Lantern for the briefing, Gus waiting on the hotel steps for the hand-over. */
function setup(kit, stage) {
  const props = kit.scope();
  if (stage === 0) props.actor('nell', 'lantern');
  const gus = props.actor('gus', 'pell-hotel', { clip: 'idle' });
  props.onPassed = () => {
    props.focus = gus.position;
  };
  return props;
}

export const LANTERN_RUN = Object.freeze({
  id: 'lantern-run',
  number: 1,
  title: 'Lantern Run',
  giver: 'nell',
  requires: [],
  startAt: 'lantern',
  colour: '#c45cff',
  reward: { cash: 1200, respect: 10 },
  outfit: 'courier-jacket',
  intro: [
    ['nell', 'Ilo Rask. Gus says you owe him forty. Gus says a lot of things.'],
    ['ilo', 'He also says you have work.'],
    ['nell', 'A parcel at the Coral Street kiosk. You walk it to Gus. Walk, not drive.'],
    ['ilo', 'What is in it?'],
    ['nell', 'Your first payment, if it gets there sealed. And no police on your heels. Couriers stay boring.'],
  ],
  stages: [
    {
      type: 'goto', text: 'Collect the parcel at the Coral Street kiosk', at: 'newsbox', radius: 3.5, onFoot: true,
      next: 'Walk it to Gus at the Hotel Aurelio',
      talk: [['nell', 'The kiosk man knows your face now. Do not make him regret it.']],
    },
    {
      type: 'deliver', text: 'Walk the parcel to Gus at the Hotel Aurelio', at: 'pell-hotel', radius: 4,
      wait: 1.5, onFoot: true, noWanted: true, checkpoint: true, start: 'newsbox',
      next: 'Hand it over without a tail',
      talk: [['ilo', 'Heavy for paper.'], ['nell', 'Then hold it like it is glass.']],
    },
  ],
  outro: [
    ['gus', 'Sealed. Good boy. That is the interest for this week.'],
    ['ilo', 'The interest? That was supposed to be payment.'],
    ['gus', 'Payment starts when the interest stops, Ilo. Keep the jacket. Nell likes her runners to look the part.'],
  ],
  setup,
});
