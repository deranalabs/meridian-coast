// Headless Chrome over the DevTools protocol with Node's built-in WebSocket, plus the local static server.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // not up yet
    }
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${url}`);
}

/** Start `node serve.ts` on `port`; returns {url, stop()}. */
export async function startServer(port) {
  const child = spawn(process.execPath, ['serve.ts', '--port', String(port)], { cwd: ROOT, stdio: 'ignore' });
  await waitFor(`http://127.0.0.1:${port}/index.html`, 10000);
  return { url: `http://127.0.0.1:${port}/`, stop: () => child.kill('SIGTERM') };
}

/** Launch headless Chrome; gpu=true asks for the real GPU through Metal. Returns {page, stop()}. */
export async function launchChrome({ width = 1280, height = 800, gpu = true, port = 9333 } = {}) {
  const profile = join(ROOT, 'tmp', `chrome-profile-${port}`);
  rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ];
  if (gpu) args.push('--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu');
  else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  args.push('about:blank');
  const child = spawn(CHROME, args, { stdio: 'ignore' });
  const listResponse = await waitFor(`http://127.0.0.1:${port}/json/list`, 15000);
  let targets = await listResponse.json();
  for (let tries = 0; tries < 30 && !targets.some((t) => t.type === 'page'); tries += 1) {
    await sleep(200);
    targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  }
  const target = targets.find((t) => t.type === 'page');
  const page = await connect(target.webSocketDebuggerUrl);
  return {
    page,
    async stop() {
      page.close();
      child.kill('SIGTERM');
      await sleep(400);
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

/** A minimal CDP session: send(method, params) and on(event, handler). */
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolve(message.result);
    } else if (message.method && listeners.has(message.method)) {
      for (const handler of listeners.get(message.method)) handler(message.params);
    }
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on(method, handler) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(handler);
    },
    async evaluate(expression) {
      const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    close() {
      socket.close();
    },
  };
}

export { ROOT, sleep };
