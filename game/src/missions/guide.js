// Mission guide: where the gold pillars stand, the minimap blips and road route to the target, and stage progress.
import { routeBetween } from '../police/navigate.js';
import { stageTarget, OBJECTIVE_TYPES } from './objectives.js';
import { availableMissions } from './progress.js';
import { UI_TOKENS } from '../palette.js';

const ROUTE_EVERY = 0.6;
const BLIPS_EVERY = 0.2;
const ROUTE_MIN = 28;
const BIG = new Set(['drive', 'deliver']);

/** Guide state over `game`; update(...) refreshes pillars, blips and the route on their own timers. */
export function missionGuide(game) {
  const graph = game.city.layout.graph;
  const out = { blips: [], route: null };
  const timers = { route: 0, blips: 0 };
  const pins = [];

  function idle(defs, progress, pillars) {
    pins.length = 0;
    out.blips = [];
    for (const def of availableMissions(progress, defs)) {
      if (!def.startAt) continue;
      pins.push({ x: def.startAt.x, y: def.startAt.y, z: def.startAt.z, size: 1 });
      out.blips.push({ x: def.startAt.x, z: def.startAt.z, mission: true, colour: def.colour ?? UI_TOKENS.gold,
        label: def.title });
    }
    pillars.show(pins);
    out.route = null;
  }

  function running(run, view, pillars) {
    const stage = run.def.stages[run.stage];
    const target = stageTarget(stage, view);
    pins.length = 0;
    out.blips = [...(view.blips ?? [])];
    if (stage.at) pins.push({ x: stage.at.x, y: stage.at.y, z: stage.at.z, size: BIG.has(stage.type) ? 2.2 : 1 });
    else if (target && (stage.type === 'race' || BIG.has(stage.type))) {
      pins.push({ x: target.x, y: target.y ?? game.ground.surfaceAt(target.x, target.z).height, z: target.z,
        size: 2.2 });
    }
    if (target) out.blips.push({ x: target.x, z: target.z, mission: true, target: !stage.at, colour: UI_TOKENS.gold });
    pillars.show(pins);
    return target;
  }

  return {
    get blips() {
      return out.blips;
    },
    get route() {
      return out.route;
    },
    update(dt, run, view, defs, progress, pillars) {
      timers.blips -= dt;
      timers.route -= dt;
      if (timers.blips > 0) return;
      timers.blips = BLIPS_EVERY;
      if (!run) {
        idle(defs, progress, pillars);
        return;
      }
      const target = running(run, view, pillars);
      if (!target || timers.route > 0) return;
      timers.route = ROUTE_EVERY;
      const far = Math.hypot(target.x - view.x, target.z - view.z) > ROUTE_MIN;
      out.route = far ? routeBetween(graph, view.x, view.z, target.x, target.z) : null;
      if (out.route) out.route.unshift({ x: view.x, z: view.z });
    },
    /** 0..1 for stages with a measurable progress (deliver wait, follow distance, enemies down), else null. */
    progress(run) {
      const stage = run.def.stages[run.stage];
      const memo = run.memo;
      if (stage.type === 'deliver') return memo.progress ?? 0;
      if (stage.type === 'race' && memo.gates) return memo.gate / memo.gates;
      if (stage.type === 'defeat' && stage.count) return 1 - (memo.left ?? stage.count) / stage.count;
      if (stage.type === 'follow' && memo.metres !== undefined) {
        return Math.max(0, Math.min(1, 1 - memo.metres / (stage.max ?? 90)));
      }
      return null;
    },
    label: (stage) => OBJECTIVE_TYPES[stage.type],
  };
}
