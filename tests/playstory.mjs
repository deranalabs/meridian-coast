// Story playthrough: missions one to six, both heist parts and the street race in story order, each met at its
// gold pillar with E, failed once where cheap, retried from its checkpoint and passed with the reward paid.
// Fails on any console error or a stage that never clears. PLAY_DEBUG=1 logs every stage.
import { launchChrome, startServer, sleep } from './cdp.mjs';
import { tap, state, job, boot, until, talkThrough, leaveCar, parkAt, clearStage } from './storykit.mjs';

const M = 'window.__meridian.game';
const ORDER = ['lantern-run', 'salt-and-chrome', 'causeway-sprint', 'white-van', 'headline', 'hill-favour',
  'tarp-run', 'tide-tables', 'gilded-tide'];

/** One cheap failure per job: the stage to fail at, the reason expected, and how to cause it. */
const FAILS = {
  'salt-and-chrome': [1, 'car-destroyed', (page) => page.evaluate(`${M}.missions.state.props.cars['voss-coupe']
    .health = 0`)],
  'white-van': [1, 'too-far', (page) => parkAt(page, `(() => { const t = ${M}.missions.state.props.targets.van;
    return { x: t.x + 260, z: t.z }; })()`)],
  headline: [4, 'caught', (page) => page.evaluate(`(() => { const i = ${M}.ilo.position;
    ${M}.action.police.alert(1, i.x, i.z); ${M}.action.events.emit('busted', { x: i.x, z: i.z }); })()`)],
  'hill-favour': [1, 'abandoned', async (page) => {
    await parkAt(page, `${M}.missions.state.props.targets.downhill`);
    await sleep(400);
    await leaveCar(page);
  }],
  'tarp-run': [3, 'car-destroyed', (page) => page.evaluate(`${M}.missions.state.props.cars['dex-van'].health = 0`)],
  'tide-tables': [0, 'heat', (page) => page.evaluate(`(() => { const i = ${M}.ilo.position;
    ${M}.action.police.alert(1, i.x, i.z); })()`)],
  'gilded-tide': [4, 'car-destroyed', (page) => page.evaluate(`${M}.missions.state.props.cars['linen-van']
    .health = 0`)],
};

const server = await startServer(8136);
const chrome = await launchChrome({ port: 9338 });
const errors = [];
const checks = [];
const check = (name, ok, detail = '') => checks.push([name, Boolean(ok), detail]);
const debug = (...args) => process.env.PLAY_DEBUG && console.log(...args);

/** Meet the giver at the pillar with E; fall back to the director when the pillar is out of reach. */
async function meet(page, id) {
  await leaveCar(page);
  await page.evaluate(`(() => { const d = ${M}.missions.definition('${id}'); const a = d.startAt;
    return window.__meridian.teleport(a.x, a.z, 0); })()`);
  await sleep(300);
  await tap(page, 'KeyE');
  const byPillar = (await job(page)).id === id;
  if (!byPillar) await page.evaluate(`${M}.missions.start('${id}')`);
  await talkThrough(page);
  return byPillar;
}

/** Take one job from its pillar to its payout, failing it once on the way if FAILS names a way. */
async function play(page, id) {
  const def = JSON.parse(await page.evaluate(`JSON.stringify((() => { const d = ${M}.missions.definition('${id}');
    return { reward: d.reward, stages: d.stages.length, checkpoints: d.stages.map((s) => Boolean(s.checkpoint)),
      alerts: d.stages.map((s) => s.alert ?? 0) };
  })())`));
  const before = (await state(page)).cash;
  const byPillar = await meet(page, id);
  let now = await job(page);
  check(`${id}: met at the pillar and briefed`, now.id === id && now.phase === 'active', byPillar ? '' : 'no E');
  let failed = !FAILS[id];
  for (let step = 0; step < 24 && now.phase === 'active'; step += 1) {
    const [at, reason, cause] = FAILS[id] ?? [];
    if (!failed && now.stage === at) {
      failed = true;
      await cause(page);
      const down = await until(page, (j) => j.phase === 'failed', 6000);
      check(`${id}: fails with "${reason}"`, down.reason === reason, down.reason ?? down.phase);
      // The retry key only works once a busted or wasted Ilo is back on his feet.
      let back = down;
      for (let i = 0; i < 40 && back.phase !== 'active'; i += 1) {
        await tap(page, 'Enter');
        back = await job(page);
      }
      const want = def.checkpoints.slice(0, at + 1).lastIndexOf(true);
      const stars = (await state(page)).stars;
      check(`${id}: Enter retries from stage ${Math.max(0, want) + 1}`, back.stage === Math.max(0, want)
        && (def.alerts[back.stage] ? stars > 0 : stars === 0), `stage ${back.stage + 1}, ${stars} stars`);
      now = back;
      continue;
    }
    const result = await clearStage(page);
    debug(id, now.stage, JSON.stringify(result));
    if (result.phase === 'active' && result.stage === now.stage) {
      const { mode, stars, cash, health } = await state(page);
      check(`${id}: stage ${now.stage + 1} (${result.type}) clears`, false,
        JSON.stringify({ ...result, mode, stars, cash, health }));
      break;
    }
    if (result.dropped === 0) check(`${id}: stage ${now.stage + 1} has a crew to fight`, false);
    if (result.type === 'evade' || result.stars) {
      check(`${id}: stage ${now.stage + 1} brings police`, result.stars > 0 && result.units > 0,
        `${result.stars} stars, ${result.units} units`);
    }
    if (result.phase === 'failed') {
      check(`${id}: stage ${now.stage + 1} (${result.type}) clears without failing`, false, result.reason);
      break;
    }
    now = result;
  }
  // Cash is counted from the outro on, since heist gear is bought during the job.
  const unpaid = now.phase === 'outro' ? now.cash : before;
  if (now.phase === 'outro') await talkThrough(page);
  now = await until(page, (j) => j.phase === 'idle', 4000);
  const paid = (await state(page)).cash - unpaid;
  check(`${id}: passed and paid $${def.reward.cash.toLocaleString('en-US')}`, now.phase === 'idle'
    && paid >= def.reward.cash, `paid ${paid}`);
}

try {
  const { page } = chrome;
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  page.on('Runtime.exceptionThrown', (e) => errors.push(e.exceptionDetails?.exception?.description));
  page.on('Runtime.consoleAPICalled', (e) => {
    if (e.type === 'error' || e.type === 'warning') errors.push(e.args.map((a) => a.value ?? a.description).join(' '));
  });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1,
    mobile: false });
  await boot(page, `${server.url}index.html?seed=1&fresh=1`);
  await tap(page, 'Enter');
  await sleep(400);
  await page.evaluate(`${M}.player.state.wallet.cash = 20000`);
  // PLAY_FROM=<id> marks every earlier job done and starts there (for chasing one job's bug).
  const from = Math.max(0, ORDER.indexOf(process.env.PLAY_FROM ?? ORDER[0]));
  await page.evaluate(`${M}.missions.progress.done.push(...${JSON.stringify(ORDER.slice(0, from))})`);
  for (const id of ORDER.slice(from)) {
    await play(page, id);
    if (checks.some(([, ok]) => !ok)) break;
  }
  const progress = JSON.parse(await page.evaluate(`JSON.stringify(${M}.missions.progress)`));
  check('the story ends with every job done', ORDER.every((id) => progress.done.includes(id)),
    `done: ${progress.done.join(', ')}`);
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
  }
  console.log(JSON.stringify({ cash: (await state(page)).cash, respect: progress.respect, fails: progress.fails }));
  if (errors.length) console.log(`console errors:\n${errors.join('\n')}`);
  if (errors.length || checks.some(([, ok]) => !ok)) process.exitCode = 1;
} finally {
  // The server goes first, so a failed profile cleanup cannot leave it holding the port.
  server.stop();
  await chrome.stop();
}
