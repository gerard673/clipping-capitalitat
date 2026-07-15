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
  const pageSize = 1000;
  let from = 0;
  const rows = [];

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

async function listAllStoragePaths(bucket, prefix = "") {
  const paths = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset });

    if (error) {
      console.warn(`No s'ha pogut llistar ${bucket}/${prefix}`, error.message);
      return paths;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      // A Supabase, les carpetes virtuals solen no tenir id.
      if (!item.id && !item.metadata) {
        const nested = await listAllStoragePaths(bucket, fullPath);
        paths.push(...nested);
      } else {
        paths.push(fullPath);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return paths;
}

async function removeStorageBucketFiles(bucket) {
  const paths = await listAllStoragePaths(bucket);

  if (paths.length === 0) {
    console.log(`${bucket}: cap fitxer per eliminar.`);
    return;
  }

  console.log(`${bucket}: eliminant ${paths.length} fitxers...`);

  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);

    const { error } = await supabase.storage
      .from(bucket)
      .remove(chunk);

    if (error) throw error;
  }

  console.log(`${bucket}: eliminat.`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

console.log("Fent backup...");

const reculls = await fetchAll("press_reculls");
const impacts = await fetchAll("press_impacts");

fs.writeFileSync(
  `scripts/backups/backup_press_reculls_${stamp}.json`,
  JSON.stringify(reculls, null, 2),
);

fs.writeFileSync(
  `scripts/backups/backup_press_impacts_${stamp}.json`,
  JSON.stringify(impacts, null, 2),
);

console.log(`Backup reculls: ${reculls.length}`);
console.log(`Backup impactes: ${impacts.length}`);

console.log("Eliminant fitxers de Storage...");

await removeStorageBucketFiles("press-page-images");
await removeStorageBucketFiles("press-pdfs");

console.log("Eliminant files de base de dades...");

const { error: impactsError } = await supabase
  .from("press_impacts")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");

if (impactsError) throw impactsError;

const { error: recullsError } = await supabase
  .from("press_reculls")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");

if (recullsError) throw recullsError;

console.log("");
console.log("RESET COMPLET FET.");
console.log("S'han eliminat reculls, impactes, PDFs i PNGs.");
console.log("Ara pots tornar a importar els PDFs des de zero.");
