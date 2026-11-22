// Shot-scene story seed: puts a staged scene at a point in the story (jobs done, respect, cash, weapons owned).
import { giveWeapon } from './combat/arsenal.js';
import { STORY_MISSIONS } from './missions/story/index.js';

/** The points in the story the staged scenes stand at. */
export const STORY_POINTS = Object.freeze({
  /** Job four open: what the first three jobs pay ($8,880, 45 respect), less a pistol from the gun shop. */
  fourthJob: Object.freeze({ jobs: 3, cash: 8430, respect: 45, weapons: Object.freeze(['pistol']) }),
  /** Gilded Tide, the last job: seven jobs done and some side work, a Harbour Name with both bought guns. */
  lastJob: Object.freeze({ jobs: 7, cash: 52400, respect: 152, weapons: Object.freeze(['pistol', 'smg']) }),
});

/** Put a new game at `point`; call it before jumping to a job. The scene then sets ammo, health and position. */
export function seedStory(game, point) {
  const done = STORY_MISSIONS.slice(0, point.jobs).map((def) => def.id);
  const { progress } = game.missions;
  progress.done.push(...done);
  progress.paid.push(...done);
  progress.respect = point.respect;
  const { wallet, arsenal } = game.player.state;
  wallet.cash = point.cash;
  for (const id of point.weapons) giveWeapon(arsenal, id);
}
