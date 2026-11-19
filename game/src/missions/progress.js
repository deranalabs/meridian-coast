// Story progress: finished missions, respect and rank, rewards paid once, and the save-safe form of it all.

/** Respect thresholds and the street name each one earns. */
export const RANKS = Object.freeze([
  { respect: 0, name: 'Nobody' },
  { respect: 10, name: 'Runner' },
  { respect: 30, name: 'Known Face' },
  { respect: 60, name: 'Earner' },
  { respect: 100, name: 'Harbour Name' },
]);

const ID = /^[a-z0-9-]{1,40}$/;

export function createProgress() {
  return { done: [], paid: [], respect: 0, fails: 0 };
}

/** The rank for a respect score. */
export function rankFor(respect) {
  let rank = RANKS[0];
  for (const entry of RANKS) if (respect >= entry.respect) rank = entry;
  return rank;
}

/** A mission is open when every mission it requires is done and it is not done itself. */
export function isAvailable(progress, def) {
  if (progress.done.includes(def.id)) return false;
  return (def.requires ?? []).every((id) => progress.done.includes(id));
}

/** Missions from `defs` the player can start now, in story order. */
export const availableMissions = (progress, defs) =>
  defs.filter((def) => isAvailable(progress, def)).sort((a, b) => a.number - b.number);

/**
 * Mark the mission done and pay its reward into the wallet, at most once per mission id.
 * Returns {cash, respect} actually paid (zeros when it was already paid).
 */
export function payReward(progress, def, wallet) {
  if (!progress.done.includes(def.id)) progress.done.push(def.id);
  if (progress.paid.includes(def.id)) return { cash: 0, respect: 0 };
  progress.paid.push(def.id);
  const cash = Math.max(0, Math.round(def.reward?.cash ?? 0));
  const respect = Math.max(0, Math.round(def.reward?.respect ?? 0));
  wallet.cash += cash;
  progress.respect += respect;
  return { cash, respect };
}

/** Turn anything loaded from a save into valid progress. */
export function cleanProgress(raw) {
  const out = createProgress();
  if (!raw || typeof raw !== 'object') return out;
  const ids = (list) => (Array.isArray(list) ? [...new Set(list.filter((id) => ID.test(String(id))))] : []);
  out.done = ids(raw.done).slice(0, 64);
  out.paid = ids(raw.paid).filter((id) => out.done.includes(id));
  const number = (value) => (Number.isFinite(value) ? Math.max(0, Math.min(99999, Math.round(value))) : 0);
  out.respect = number(raw.respect);
  out.fails = number(raw.fails);
  return out;
}
