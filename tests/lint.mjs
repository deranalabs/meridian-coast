// Code-rule check: every authored source file opens with a one-line comment and no line exceeds 120 chars.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { ROOT } from './cdp.mjs';

const LIMIT = 120;
const EXTENSIONS = new Set(['.js', '.mjs', '.css', '.ts']);

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'vendor' || name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (EXTENSIONS.has(extname(name))) yield path;
  }
}

const problems = [];
let checked = 0;
for (const folder of ['game/src', 'tests']) {
  for (const path of files(join(ROOT, folder))) {
    checked += 1;
    const lines = readFileSync(path, 'utf8').split('\n');
    const first = lines[0].trim();
    const commented = first.startsWith('//') || first.startsWith('/*');
    if (!commented) problems.push(`${relative(ROOT, path)}:1 no header comment`);
    lines.forEach((line, index) => {
      if (line.length > LIMIT) problems.push(`${relative(ROOT, path)}:${index + 1} ${line.length} chars`);
    });
  }
}
console.log(`${checked} files checked, ${problems.length} problems`);
for (const problem of problems) console.log(problem);
if (problems.length) process.exitCode = 1;
