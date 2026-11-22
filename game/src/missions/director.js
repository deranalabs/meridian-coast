// Mission director: offers jobs at their start pillars, runs one at a time, retries from checkpoints, pays out.
import { createRun, stepRun, restartRun, failRun, currentStage, jobLabel, stageLabel, stageTexts } from './machine.js';
import { createProgress, cleanProgress, availableMissions, payReward } from './progress.js';
import { failText } from './failures.js';
import { resolveMission } from './resolve.js';
import { createWorldView } from './worldview.js';
import { createPillars } from './pillar.js';
import { missionGuide } from './guide.js';

const START_REACH = 2.6;
const FAIL_KEYS = '<kbd>Enter</kbd> retry from checkpoint &nbsp; <kbd>Backspace</kbd> call it off';

/**
 * Missions over a game: `defs` are mission definitions, `places` maps place ids to resolved places.
 * hooks: say(html, s, kind), talk(lines, done), kit (prop spawner for def.setup), cast (id to character),
 * save(), onEvent(name, data), dress(pieceIds) and undress() for a mission's story outfit. update(dt, input) runs
 * before the player moves.
 */
export function createMissions(game, defs, places, hooks = {}) {
  const resolved = defs.map((def) => resolveMission(def, places));
  const byId = new Map(resolved.map((def) => [def.id, def]));
  const world = createWorldView(game);
  const pillars = createPillars();
  game.scene.add(pillars.group);
  const guide = missionGuide(game);
  const say = hooks.say ?? (() => {});
  const talk = hooks.talk ?? ((lines, done) => done());
  const emit = (name, data = {}) => hooks.onEvent?.(name, data);
  const state = { run: null, phase: 'idle', props: null, offer: null, prompt: null, paid: null };
  let progress = createProgress();

  const giverName = (def) => hooks.cast?.(def.giver)?.name ?? '';

  function setupStage(index, restart) {
    // A retry respawns the mission's cars, so a mission car Ilo still sits in (wrecked or stolen) must go.
    const stale = restart && game.player.state.car?.missionTag ? game.player.state.car : null;
    state.props?.dispose?.();
    state.props = state.run.def.setup?.(hooks.kit, index, restart) ?? null;
    const stage = state.run.def.stages[index];
    if (restart) {
      game.action.police.standDown();
      const start = stage.start ?? state.run.def.startAt ?? stale?.position;
      // A stage that names its own start always puts Ilo there, out of any car (the stage respawns its cars).
      const place = stage.start || stale || game.player.state.mode === 'foot';
      if (start && place) game.player.placeOnFoot(start.x, start.z, start.heading ?? 0);
      if (stale && game.player.state.car !== stale) {
        stale.visible = false;
        stale.spare = true;
      }
    }
  }

  /** A stage begins: the props hear about it and a stage with `alert` raises the real wanted level. */
  function enterStage(index) {
    state.props?.onStage?.(index);
    const stage = state.run.def.stages[index];
    if (stage.alert) game.action.police.alert(stage.alert, world.view.x, world.view.z);
  }

  function announce(stage) {
    say(stage.text, 3.5, 'objective');
    if (stage.talk?.length) talk(stage.talk, () => {});
  }

  function finish() {
    const def = state.run.def;
    state.paid = payReward(progress, def, game.player.state.wallet, state.props?.bonus?.() ?? 0);
    const headline = def.activity ? 'Job done' : 'Mission passed';
    say(`${headline} <em>+$${state.paid.cash.toLocaleString('en-US')}</em> &nbsp;+${state.paid.respect} respect`,
      4.5, 'passed');
    emit('passed', { id: def.id, ...state.paid });
    stop();
    if (game.action.police.wanted.stars === 0) hooks.save?.();
  }

  function handle(event) {
    const run = state.run;
    if (event.type === 'stage') {
      enterStage(event.index);
      announce(event.stage);
    }
    else if (event.type === 'cleared') emit('cleared', { id: run.def.id, index: event.index });
    else if (event.type === 'failed') {
      progress.fails += 1;
      hooks.hush?.();
      say(`Mission failed: ${failText(event.reason)}`, 3.5, 'failed');
      state.phase = 'failed';
      emit('failed', { id: run.def.id, reason: event.reason });
    } else if (event.type === 'passed') {
      state.phase = 'outro';
      state.props?.onPassed?.();
      emit('complete', { id: run.def.id, colour: run.def.colour });
      talk(run.def.outro ?? [], finish, { scene: true, focus: state.props?.focus ?? null });
    }
  }

  function stop() {
    if (state.phase !== 'outro') hooks.hush?.();
    state.props?.dispose?.();
    state.props = null;
    state.run = null;
    state.phase = 'idle';
    game.player.state.frozen = false;
    hooks.undress?.();
  }

  /** Start mission `id` if it is open and nothing else runs; returns whether it started. */
  function start(id) {
    const def = byId.get(id);
    if (!def || state.run || !availableMissions(progress, [def]).length) return false;
    world.clearLatches(true);
    state.run = createRun(def);
    state.phase = 'intro';
    setupStage(0, false);
    if (def.outfit?.length) hooks.dress?.(def.outfit);
    emit('started', { id });
    talk(def.intro ?? [], () => {
      if (!state.run) return;
      state.phase = 'active';
      announce(currentStage(state.run));
    }, { scene: true, focus: state.props?.focus ?? def.startAt });
    return true;
  }

  /**
   * Start `id` straight at stage `index` (scripted scenes and tests), skipping the intro: the stage is set up
   * as a checkpoint, its alert raised and its line and talk played. Story order is not checked.
   */
  function jump(id, index) {
    const def = byId.get(id);
    if (!def || state.run || index < 0 || index >= def.stages.length) return false;
    world.clearLatches(true);
    state.run = createRun(def);
    state.run.stage = index;
    state.run.checkpoint = index;
    state.phase = 'active';
    setupStage(index, false);
    if (def.outfit?.length) hooks.dress?.(def.outfit);
    emit('started', { id });
    enterStage(index);
    announce(currentStage(state.run));
    return true;
  }

  function retry() {
    world.clearLatches();
    const [event] = restartRun(state.run);
    state.phase = 'active';
    setupStage(event.index, true);
    enterStage(event.index);
    hooks.unsay?.('failed');
    say(`Checkpoint: ${event.stage.text}`, 3, 'objective');
    emit('retry', { id: state.run.def.id, stage: event.index });
  }

  function nearestOffer() {
    const p = game.player.state;
    if (p.mode !== 'foot' || p.down || p.frozen) return null;
    for (const def of availableMissions(progress, resolved)) {
      const at = def.startAt;
      if (at && Math.hypot(at.x - game.ilo.position.x, at.z - game.ilo.position.z) < START_REACH) return def;
    }
    return null;
  }

  return {
    state,
    pillars,
    start,
    jump,
    get progress() {
      return progress;
    },
    get active() {
      return Boolean(state.run);
    },
    loadProgress(raw) {
      progress = cleanProgress(raw);
    },
    available: () => availableMissions(progress, resolved),
    /** Job gear the shops put on sale now: the item a running buy stage asks for (and every later one). */
    gearWanted() {
      const run = state.run;
      if (!run || state.phase !== 'active') return [];
      return run.def.stages.slice(run.stage).filter((stage) => stage.type === 'buy').map((stage) => stage.item);
    },
    definition: (id) => byId.get(id) ?? null,
    /** Call the running job off (from the phone or the failed panel). */
    quit() {
      if (!state.run) return;
      if (state.phase === 'active') failRun(state.run, 'quit');
      emit('quit', { id: state.run.def.id });
      stop();
    },
    update(dt, input) {
      const respawning = game.services?.respawn.active;
      state.offer = state.run ? null : nearestOffer();
      state.prompt = state.offer ? `Press <kbd>E</kbd> to meet ${giverName(state.offer)}` : null;
      if (state.offer && input.pressed('KeyE')) start(state.offer.id);
      const run = state.run;
      if (run && state.phase === 'active') {
        // A `quiet` stage happens with the alarm cut: no call reaches the precinct until it is over.
        if (currentStage(run).quiet && game.action.police.wanted.stars > 0) game.action.police.standDown();
        state.props?.update?.(dt, world.view);
        for (const event of stepRun(run, world.refresh(state.props), dt)) handle(event);
      } else if (run && state.phase === 'failed' && !respawning) {
        if (input.pressed('Enter')) retry();
        else if (input.pressed('Backspace')) this.quit();
      } else if (run) state.props?.update?.(dt, world.view);
      if (run && state.phase !== 'active') guide.hold(pillars);
      else guide.update(dt, run, world.view, resolved, progress, pillars);
      pillars.update(game.time);
      return state.prompt;
    },
    /** The mission panel's view, or null with no job running. */
    hudView() {
      const run = state.run;
      if (!run) return null;
      const texts = stageTexts(run);
      return { title: run.def.title, job: jobLabel(run.def, resolved), giver: giverName(run.def),
        colour: run.def.colour, stage: stageLabel(run), objective: texts.objective, next: texts.next,
        progress: state.phase === 'active' ? guide.progress(run) : null,
        failed: state.phase === 'failed' ? { text: failText(run.reason), keys: FAIL_KEYS } : null };
    },
    get blips() {
      return guide.blips;
    },
    get route() {
      return guide.route;
    },
  };
}
