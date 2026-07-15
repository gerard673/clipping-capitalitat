import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const DRY_RUN = process.argv.includes("--dry-run");

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

async function listFilesRecursive(bucket, prefix = "") {
  const files = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      console.warn(`Error llistant ${bucket}/${prefix}:`, error.message);
      return files;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      const isFolder =
        item.id === null ||
        item.id === undefined ||
        item.updated_at === null ||
        item.updated_at === undefined;

      if (isFolder) {
        const nested = await listFilesRecursive(bucket, fullPath);
        files.push(...nested);
      } else {
        files.push(fullPath);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function emptyBucket(bucket) {
  console.log("");
  console.log(`Bucket: ${bucket}`);

  const files = await listFilesRecursive(bucket);

  console.log(`Fitxers trobats: ${files.length}`);

  if (files.length > 0) {
    console.log("Primers fitxers:");
    for (const file of files.slice(0, 20)) {
      console.log(`- ${file}`);
    }
  }

  if (DRY_RUN) {
    console.log("DRY RUN: no s'ha eliminat res.");
    return;
  }

  for (let i = 0; i < files.length; i += 100) {
    const chunk = files.slice(i, i + 100);

    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(chunk);

    if (error) {
      console.error(`Error eliminant chunk de ${bucket}:`, error.message);
      throw error;
    }

    console.log(`${bucket}: eliminats ${Math.min(i + 100, files.length)} / ${files.length}`);
  }

  console.log(`${bucket}: buidat.`);
}

await emptyBucket("press-page-images");
await emptyBucket("press-pdfs");

console.log("");
console.log(DRY_RUN ? "Revisió acabada." : "Storage buidat.");
