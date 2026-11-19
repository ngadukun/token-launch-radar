// Token launch radar (token-radar-01): a Node 22 program, standard library
// only, no network, deterministic — two runs over the sealed snapshot write
// byte-identical output.
//
//   node main.ts [--input <snapshot.json|directory>] [--output <directory>]
//
// It reads the snapshot (default /input/snapshot.json; MAKEFUN_OUTPUT_DIR
// stands in for /output outside the grader's container), scores every
// pre-token protocol with the model in lib/model.ts, gives each a farm plan
// from lib/plans.ts, and writes into the output directory:
//   board.json    the ranked board the gate reads
//   data.js       the same board, as the dashboard's data file
//   dashboard/    a copy of this repository's dashboard/
//   screenshots/  a copy of this repository's screenshots/
//   dossier.json  buildDossier's summary of the two, which the judge reads

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildBoard, dataScript, parseSnapshot } from './lib/model.ts';
import { farmSteps } from './lib/plans.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The scorer's caps, as the gate states them: the dossier text cap shapes
 *  the bytes buildDossier writes; the rest only refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const DASHBOARD_CAPS = { max_files: 400, max_bytes: 4_194_304 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** The value of --name in the arguments (either spelling), or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const glued = process.argv.find((a) => a.startsWith(`--${name}=`));
  return glued === undefined ? fallback : glued.slice(name.length + 3);
}

function fail(message: string): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(1);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  process.stderr.write(
    `token radar: no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input\n`,
  );
  process.exit(2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { rows, meta } = buildBoard(snapshot);
for (const row of rows) row.farm_steps = farmSteps(row);
const issue = boardIssue(rows, snapshot);
if (issue !== null) fail(`the model wrote a board the gate refuses: ${issue}`);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(meta, rows));

/** Copy a directory's regular files into `to`, skipping dot names. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const pageDir = join(here, 'dashboard');
const pageSource = existsSync(pageDir) ? readdirSync(pageDir).filter((n) => !n.startsWith('.')) : [];
if (!pageSource.includes('index.html') || !pageSource.some((n) => n.endsWith('.css')) || !pageSource.some((n) => n.endsWith('.js'))) {
  fail('dashboard/ must hold index.html and at least one .css and one .js file: the page is half the entry');
}

const pageFiles = copyFiles(pageDir, join(out, 'dashboard'));
const pageBytes = pageFiles.reduce((n, name) => n + statSync(join(pageDir, name)).size, 0);

const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  fail(`screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3 or 4 — the board, a detail view and a filtered view`);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
}

// The dossier goes last: the scorer rebuilds it from this same output and
// compares byte for byte, so it must describe the files as they now stand.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: DASHBOARD_CAPS }),
);

const leaders = rows
  .slice(0, 3)
  .map((r) => `#${r.rank} ${r.name} $${r.implied_value_usd.toLocaleString('en-US')}`)
  .join(' · ');
process.stdout.write(
  `token radar: snapshot of ${meta.as_of}: ${meta.protocols_scanned} protocols, ${meta.comparables} tokenised comparables, global multiple ${meta.global_multiple}\n` +
    `token radar: board of ${meta.board_rows} pre-token protocols (${meta.watchlist_rows} watchlist, ${meta.find_rows} below-floor finds), ` +
    `median implied $${meta.median_implied_usd.toLocaleString('en-US')}\n` +
    `token radar: ${leaders}\n` +
    `token radar: wrote board.json, data.js, dashboard/ (${pageFiles.length} files, ${pageBytes} bytes of source), screenshots/ (${shots.length} images) and dossier.json to ${out}\n`,
);
