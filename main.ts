// Menyerahkan game: menyalin game/ dan screenshots/ ke /output dan menulis
// /output/dossier.json lewat buildDossier dari vendor/makefun-game.ts.
// Semua path dihitung dari lokasi file ini (import.meta.url), bukan dari CWD.
// Hanya ISI direktori output yang dibersihkan — direktorinya sendiri tidak
// pernah dihapus. Di luar grader, MAKEFUN_OUTPUT_DIR menggantikan /output.
// Ditulis tanpa anotasi tipe agar lolos pemeriksa sintaks node apa pun.
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = here;
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

async function clearContents(dir) {
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  for (const entry of entries) {
    await rm(join(dir, entry), { recursive: true, force: true });
  }
}

async function main() {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  await clearContents(outDir);
  await cp(gameDir, join(outDir, 'game'), { recursive: true });
  await cp(shotsDir, join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  await writeFile(join(outDir, 'dossier.json'), dossier);
  console.log(`wrote ${outDir}/dossier.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
