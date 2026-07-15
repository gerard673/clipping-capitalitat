import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const BACKUP_FILE = "scripts/backups/press_impacts_before_classification_rebuild_2026-07-15T08-25-14-581Z.json";

function readEnv() {
  const env = {};
  const raw = fs.readFileSync(".env.local", "utf8");

  for (const line of raw.split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;

    const index = clean.indexOf("=");
    if (index === -1) continue;

    const key = clean.slice(0, index);
    const value = clean.slice(index + 1).replace(/^["']|["']$/g, "");
    env[key] = value;
  }

  return env;
}

const env = readEnv();

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

if (!fs.existsSync(BACKUP_FILE)) {
  throw new Error(`No trobo el backup: ${BACKUP_FILE}`);
}

const rows = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8"));

console.log(`Impactes al backup: ${rows.length}`);

let restored = 0;
let missing = 0;

for (const row of rows) {
  if (!row.id) continue;

  const patch = {
    media_name: row.media_name ?? "Mitjà pendent",
    media_type: row.media_type ?? "PENDENT",
    title: row.title ?? "Títol pendent",
    url: row.url ?? null,
    source_domain: row.source_domain ?? null,
    extracted_text: row.extracted_text ?? null,
    detected_links: row.detected_links ?? [],
    status: row.status ?? "pendent",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("press_impacts")
    .update(patch)
    .eq("id", row.id)
    .select("id");

  if (error) throw error;

  if (!data || data.length === 0) {
    missing++;
  } else {
    restored++;
  }
}

console.log("");
console.log(`Restaurats: ${restored}`);
console.log(`No trobats per id: ${missing}`);
console.log("Restauració acabada.");
