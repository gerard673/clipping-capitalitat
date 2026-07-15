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

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tvPatterns = [
  "3cat.cat",
  "3cat cat",
  "tv3",
  "europapress.tv",
  "europapress tv",
  "rtve.es",
  "rtve es",
  "plastico.tv",
  "plastico tv",
  "tvsantcugat.cat",
  "tvsantcugat cat",
  "beteve",
];

const radioPatterns = [
  "catalunya radio",
  "catalunya ràdio",
  "nuevaradio.org",
  "nuevaradio org",
  "capitalradio.es",
  "capitalradio es",
  "rac 1",
  "rac1",
];

function matches(text, patterns) {
  const raw = String(text || "").toLowerCase();
  const normalized = normalize(text);

  return patterns.some((pattern) => {
    return raw.includes(String(pattern).toLowerCase()) || normalized.includes(normalize(pattern));
  });
}

function detectType(impact) {
  const haystack = [
    impact.media_name,
    impact.title,
    impact.url,
    impact.source_domain,
    impact.extracted_text,
  ].join(" ");

  if (matches(haystack, radioPatterns)) return "RADIO";
  if (matches(haystack, tvPatterns)) return "TV";

  return null;
}

async function fetchAllImpacts() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("press_impacts")
      .select("id, media_name, title, url, source_domain, extracted_text, media_type")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return rows;
}

const impacts = await fetchAllImpacts();

let updated = 0;

for (const impact of impacts) {
  const type = detectType(impact);

  if (!type || impact.media_type === type) continue;

  const { error } = await supabase
    .from("press_impacts")
    .update({
      media_type: type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", impact.id);

  if (error) throw error;

  updated++;
  console.log(`${type}: ${impact.media_name || impact.title || impact.id}`);
}

console.log(`\nActualitzats: ${updated} impactes.`);
