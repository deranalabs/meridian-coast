// The job card's short step list (done, now, still to do) and the count-up of a reward as a job is passed.

/** A stage type's step name when its text has no short "Name:" prefix. */
const TYPE_NAMES = Object.freeze({
  drive: 'Drive', defeat: 'Fight', deliver: 'Deliver', evade: 'Lose heat', goto: 'Go', follow: 'Follow',
  pickup: 'Pick up', buy: 'Buy', race: 'Race', steal: 'Steal',
});
/** A prefix longer than this is a sentence, not a step name. */
const PREFIX_MOST = 12;

/** A stage's short name: its own `step`, the text's "Vault:" style prefix, or one word for its type. */
export function stepName(stage) {
  if (stage.step) return stage.step;
  const colon = stage.text?.indexOf(':') ?? -1;
  if (colon > 0 && colon <= PREFIX_MOST) return stage.text.slice(0, colon);
  return TYPE_NAMES[stage.type] ?? 'Step';
}

/** Every stage of the running job as {name, state: 'done' | 'now' | 'todo'}. */
export function stepList(run) {
  return run.def.stages.map((stage, index) => ({
    name: stepName(stage),
    state: index < run.stage ? 'done' : index === run.stage ? 'now' : 'todo',
  }));
}

/** "$40,000 · +60 respect" style reward parts for the card; null when the job pays nothing. */
export function rewardParts(def) {
  const cash = Math.round(def.reward?.cash ?? 0);
  const respect = Math.round(def.reward?.respect ?? 0);
  if (!cash && !respect) return null;
  return { cash: `$${cash.toLocaleString('en-US')}`, respect: respect ? `+${respect} respect` : '' };
}

/** The shown amount `seconds` into a count-up to `target` lasting `duration`: eased out, whole dollars, exact last. */
export function countUp(target, seconds, duration = 1.2) {
  if (!(seconds > 0)) return 0;
  if (seconds >= duration) return target;
  const t = seconds / duration;
  return Math.round(target * (1 - (1 - t) ** 3));
}
