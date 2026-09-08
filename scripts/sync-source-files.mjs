/**
 * Push the local working tree into the Supabase `source_files` table.
 *
 * Why this exists: `npm run build` runs bootstrap.js, which DOWNLOADS every
 * file from `source_files` before `next build`. Vercel does the same on
 * deploy. So a `git push` alone does not change the live site — whatever is
 * in `source_files` wins. This script is the other half of that loop.
 *
 * Usage:
 *   node scripts/sync-source-files.mjs                 # dry run, prints a diff
 *   SUPABASE_SERVICE_KEY=... node scripts/sync-source-files.mjs --write
 *
 * The service-role key is required to write (anon is read-only here). Get it
 * from Supabase → Project Settings → API. Never commit it.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fqfadlbdsvlhgictyjob.supabase.co";
const READ_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_4ekH89HcPxt5ImsIZ6MSuw_DLsrc6ip";
const WRITE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WRITE = process.argv.includes("--write");

// Mirrors bootstrap.js: these are owned by git, not by the table.
const SKIP_FILES = new Set(["package.json", "bootstrap.js", "vercel.json"]);
const ROOTS = ["app", "components", "lib", "public"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "scripts"]);
const EXT = /\.(tsx?|css|js|mjs|json|webmanifest|svg|txt)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.test(name)) out.push(full);
  }
  return out;
}

const local = new Map();
for (const root of ROOTS) {
  let files = [];
  try {
    files = walk(root);
  } catch {
    continue; // root does not exist in this checkout
  }
  for (const f of files) {
    const p = relative(".", f).split(sep).join("/");
    if (SKIP_FILES.has(p)) continue;
    local.set(p, readFileSync(f, "utf8"));
  }
}

const res = await fetch(`${URL_BASE}/rest/v1/source_files?select=path,content`, {
  headers: { apikey: READ_KEY, Authorization: `Bearer ${READ_KEY}` },
});
if (!res.ok) throw new Error(`read failed: ${res.status} ${await res.text()}`);
const remote = new Map((await res.json()).map((r) => [r.path, r.content]));

const changed = [...local].filter(([p, c]) => remote.get(p) !== c).map(([p]) => p);
const added = changed.filter((p) => !remote.has(p));
const removed = [...remote.keys()].filter((p) => !local.has(p));

console.log(`local ${local.size} files, remote ${remote.size} rows`);
console.log(`changed: ${changed.length - added.length}, new: ${added.length}, only-remote: ${removed.length}`);
for (const p of changed) console.log(`  ${remote.has(p) ? "M" : "A"} ${p}`);
for (const p of removed) console.log(`  ? ${p}  (in the table but not locally — left alone)`);

if (!WRITE) {
  console.log("\nDry run. Re-run with --write and SUPABASE_SERVICE_KEY set to publish.");
  process.exit(0);
}
if (!WRITE_KEY) {
  console.error("\nSUPABASE_SERVICE_KEY is not set. Refusing to write.");
  process.exit(1);
}

const rows = changed.map((p) => ({ path: p, content: local.get(p) }));
for (let i = 0; i < rows.length; i += 20) {
  const batch = rows.slice(i, i + 20);
  const up = await fetch(`${URL_BASE}/rest/v1/source_files?on_conflict=path`, {
    method: "POST",
    headers: {
      apikey: WRITE_KEY,
      Authorization: `Bearer ${WRITE_KEY}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(batch),
  });
  if (!up.ok) throw new Error(`write failed: ${up.status} ${await up.text()}`);
  console.log(`wrote ${Math.min(i + 20, rows.length)}/${rows.length}`);
}
console.log("Done. Redeploy on Vercel to pick these up.");
