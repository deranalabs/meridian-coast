// Mission world view: the plain object the mission machine reads, filled from the live game once per step.

/**
 * One reused view over `game`. refresh(props) copies the player, the wanted level, death and arrest flags
 * (latched from events until consumed) and the mission props' tagged cars, moving targets and enemy counts.
 */
export function createWorldView(game) {
  const events = game.action.events;
  const view = { x: 0, z: 0, driving: false, carTag: null, stars: 0, dead: false, busted: false,
    cars: {}, targets: {}, enemies: {} };
  const latched = { dead: false, busted: false };
  view.bought = [];
  events.on('busted', () => {
    latched.busted = true;
  });
  events.on('wasted', () => {
    latched.dead = true;
  });
  events.on('purchase', (e) => {
    if (!view.bought.includes(e.id)) view.bought.push(e.id);
  });

  return {
    view,
    /** Forget any death or arrest that happened before now; a fresh job (`fresh`) also forgets what was bought. */
    clearLatches(fresh = false) {
      latched.dead = false;
      latched.busted = false;
      if (fresh) view.bought.length = 0;
    },
    refresh(props) {
      const p = game.player.state;
      const driving = p.mode === 'driving' && Boolean(p.car);
      const at = driving ? p.car.position : game.ilo.position;
      view.x = at.x;
      view.z = at.z;
      view.driving = driving;
      view.carTag = driving ? p.car.missionTag ?? null : null;
      const heat = game.action.police.heat();
      view.stars = heat.stars;
      view.seen = heat.seen;
      view.searching = heat.searching;
      view.dead = latched.dead || p.vitals.health <= 0;
      view.busted = latched.busted;
      view.cars = props?.cars ?? view.cars;
      view.targets = props?.targets ?? view.targets;
      view.enemies = props?.enemies ?? view.enemies;
      view.blips = props?.blips ?? null;
      return view;
    },
  };
}
