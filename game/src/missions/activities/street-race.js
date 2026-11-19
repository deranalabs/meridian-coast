// Side activity "Causeway Sprint": a repeatable street race from the boardwalk over the Gull Key causeway,
// through road gates, against one of Priya's drivers; pays cash and respect every time it is won.

const RIVAL_PAINT = '#ff8a3d';

/** Priya at the line; the course to the island dock; the rival takes the line when the race stage starts. */
function setup(kit, stage) {
  const props = kit.scope();
  props.actor('priya', 'sprint-line', { offset: 3 });
  const course = props.course('sprint', { from: 'sprint-line', to: 'gull-dock', spacing: 90, radius: 11,
    rival: { type: 'sedan', colour: RIVAL_PAINT, speed: 22 } });
  props.onStage = (index) => {
    if (index === 1) course.start();
  };
  if (stage === 1) course.start();
  props.onPassed = () => {
    props.focus = kit.point('gull-dock');
  };
  return props;
}

export const CAUSEWAY_SPRINT = Object.freeze({
  id: 'causeway-sprint',
  number: 101,
  title: 'Causeway Sprint',
  giver: 'priya',
  activity: true,
  repeat: true,
  requires: ['salt-and-chrome'],
  startAt: 'sprint-line',
  colour: RIVAL_PAINT,
  reward: { cash: 600, respect: 6 },
  intro: [
    ['priya', 'Boardwalk to the Gull Key dock, over the causeway, every gate. Six hundred says you lose.'],
    ['ilo', 'Bring the money to the dock, then.'],
  ],
  stages: [
    { type: 'drive', at: 'sprint-line', radius: 12, text: 'Bring any car to the sprint line',
      next: 'Race to Gull Key' },
    {
      type: 'race', target: 'sprint', inCar: true, limit: 110,
      text: 'Causeway Sprint: beat Priya\'s driver through every gate',
      talk: [['priya', 'Go!']],
    },
  ],
  outro: [['priya', 'Fine. Six hundred. Come back when you want to lose it again.']],
  setup,
});
