import { createClient } from "@supabase/supabase-js";
import fs from "fs";

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

async function fetchAll(table) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function listAllStorageFiles(bucket, prefix = "") {
  const paths = [];

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    console.warn(`No s'ha pogut llistar ${bucket}/${prefix}:`, error.message);
    return paths;
  }

  for (const item of data || []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    const looksLikeFolder =
      !item.name.includes(".") ||
      item.metadata === null ||
      item.id === null;

    if (looksLikeFolder) {
      const nested = await listAllStorageFiles(bucket, fullPath);
      paths.push(...nested);
    } else {
      paths.push(fullPath);
    }
  }

  return paths;
}

async function emptyBucket(bucket) {
  const files = await listAllStorageFiles(bucket);

  console.log(`${bucket}: ${files.length} fitxers trobats.`);

  for (let i = 0; i < files.length; i += 100) {
    const chunk = files.slice(i, i + 100);

    const { error } = await supabase.storage
      .from(bucket)
      .remove(chunk);

    if (error) throw error;

    console.log(`${bucket}: eliminats ${Math.min(i + 100, files.length)} / ${files.length}`);
  }
}

async function deleteAllRows(table) {
  const { error } = await supabase
    .from(table)
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) throw error;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

console.log("Fent backup de la base de dades...");

const reculls = await fetchAll("press_reculls");
const impacts = await fetchAll("press_impacts");

fs.writeFileSync(
  `scripts/backups/backup_press_reculls_before_empty_${stamp}.json`,
  JSON.stringify(reculls, null, 2),
);

fs.writeFileSync(
  `scripts/backups/backup_press_impacts_before_empty_${stamp}.json`,
  JSON.stringify(impacts, null, 2),
);

console.log(`Backup reculls: ${reculls.length}`);
console.log(`Backup impactes: ${impacts.length}`);

console.log("");
console.log("Buidant Storage...");

await emptyBucket("press-page-images");
await emptyBucket("press-pdfs");

console.log("");
console.log("Buidant taules...");

await deleteAllRows("press_impacts");
await deleteAllRows("press_reculls");

console.log("");
console.log("APP BUIDADA CORRECTAMENT.");
console.log("S'han eliminat reculls, impactes, PDFs i PNGs.");
