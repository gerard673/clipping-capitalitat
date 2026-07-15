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
    env[clean.slice(0, index)] = clean.slice(index + 1).replace(/^["']|["']$/g, "");
  }

  return env;
}

const env = readEnv();

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

async function listRecursive(bucket, prefix = "") {
  const paths = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });

  if (error) throw error;

  for (const item of data || []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.name.toLowerCase().endsWith(".pdf")) {
      paths.push(fullPath);
    } else if (!item.name.includes(".")) {
      const nested = await listRecursive(bucket, fullPath);
      paths.push(...nested);
    }
  }

  return paths;
}

const pdfs = await listRecursive("press-pdfs");

console.log(`PDFs trobats: ${pdfs.length}`);
for (const pdf of pdfs) console.log(pdf);
