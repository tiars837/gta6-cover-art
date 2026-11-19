// Vice Cover Studio — entrypoint for the gta6-cover-art-01 bounty.
//
// Hands the web app in: copies app/ and screenshots/ from this repository
// into the output directory and writes /output/dossier.json with the kit's
// buildDossier library. The output directory is a mount point in the
// grader's sandbox, so it is never removed itself: only its contents are
// cleared. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = resolve(import.meta.dirname);
const outDir = process.env.MAKEFUN_OUTPUT_DIR ? resolve(process.env.MAKEFUN_OUTPUT_DIR) : '/output';

/** Make sure a directory exists and is empty, without removing the directory itself. */
function clearContents(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

/** Copy a directory tree when it exists, leaving the destination alone when it does not. */
function copyTreeIfPresent(from: string, to: string): void {
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

function main(): void {
  clearContents(outDir);
  copyTreeIfPresent(join(repoRoot, 'app'), join(outDir, 'app'));
  copyTreeIfPresent(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`Vice Cover Studio handed in: ${outDir} (dossier ${dossier.length} bytes)`);
}

main();
