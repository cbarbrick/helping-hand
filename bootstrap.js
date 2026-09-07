// Downloads the app source from Supabase (table source_files) before `next build`.
// This lets the app be redeployed by updating rows, without pushing a git commit.
const fs = require("fs");
const path = require("path");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fqfadlbdsvlhgictyjob.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_4ekH89HcPxt5ImsIZ6MSuw_DLsrc6ip";
const SKIP = new Set(["package.json", "bootstrap.js", "vercel.json"]);

async function main() {
  const res = await fetch(`${URL}/rest/v1/source_files?select=path,content&order=path`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`source_files fetch failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  let n = 0;
  for (const { path: p, content } of rows) {
    if (SKIP.has(p) || p.includes("..")) continue;
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    n++;
  }
  console.log(`bootstrap: wrote ${n} files from source_files`);
  if (n === 0) throw new Error("no source files found");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
