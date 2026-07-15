import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const RESET_STATUS = true;

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
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function includesAny(text, patterns) {
  const raw = String(text || "").toLowerCase();
  const norm = normalize(text);

  return patterns.some((pattern) => {
    const pRaw = String(pattern).toLowerCase();
    const pNorm = normalize(pattern);
    return raw.includes(pRaw) || norm.includes(pNorm);
  });
}

const mediaRules = [
  { name: "Catalunya Ràdio", type: "RADIO", patterns: ["Catalunya Ràdio", "Catalunya Radio"] },
  { name: "RAC 1", type: "RADIO", patterns: ["RAC 1", "RAC1"] },
  { name: "Nueva Radio", type: "RADIO", patterns: ["nuevaradio.org", "Nueva Radio"] },
  { name: "Capital Radio", type: "RADIO", patterns: ["capitalradio.es", "Capital Radio"] },

  { name: "TV3", type: "TV", patterns: ["TV3"] },
  { name: "3Cat", type: "TV", patterns: ["3cat.cat", "3cat"] },
  { name: "Betevé", type: "TV", patterns: ["Betevé", "Beteve", "beteve.cat"] },
  { name: "RTVE", type: "TV", patterns: ["rtve.es", "RTVE"] },
  { name: "Europa Press TV", type: "TV", patterns: ["europapress.tv"] },
  { name: "Plástico TV", type: "TV", patterns: ["plastico.tv", "plástico.tv"] },
  { name: "TV Sant Cugat", type: "TV", patterns: ["tvsantcugat.cat", "TV Sant Cugat"] },

  { name: "Europa Press", type: "ONLINE", patterns: ["europapress.es", "Europa Press"] },
  { name: "La Vanguardia", type: "ONLINE", patterns: ["lavanguardia.com", "La Vanguardia"] },
  { name: "El Periódico", type: "ONLINE", patterns: ["elperiodico.com", "El Periódico"] },
  { name: "Ara", type: "ONLINE", patterns: ["ara.cat", "Diari Ara"] },
  { name: "El País", type: "ONLINE", patterns: ["elpais.com", "El País"] },
  { name: "El Mundo", type: "ONLINE", patterns: ["elmundo.es", "El Mundo"] },
  { name: "ABC", type: "ONLINE", patterns: ["abc.es"] },
];

function cleanDomain(domain) {
  return String(domain || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

function detectFromImpact(impact) {
  const haystack = [
    impact.media_name,
    impact.title,
    impact.url,
    impact.source_domain,
    impact.extracted_text,
    Array.isArray(impact.detected_links) ? impact.detected_links.join(" ") : "",
  ].join(" ");

  for (const rule of mediaRules) {
    if (includesAny(haystack, rule.patterns)) {
      return {
        mediaName: rule.name,
        mediaType: rule.type,
      };
    }
  }

  const domain = cleanDomain(impact.source_domain);

  if (domain) {
    return {
      mediaName: domain,
      mediaType: "ONLINE",
    };
  }

  try {
    if (impact.url) {
      const host = new URL(impact.url).hostname.replace(/^www\./, "");
      if (host) {
        return {
          mediaName: host,
          mediaType: "ONLINE",
        };
      }
    }
  } catch {}

  return {
    mediaName: "Mitjà pendent",
    mediaType: "PENDENT",
  };
}

async function fetchAllImpacts() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("press_impacts")
      .select("id, media_name, media_type, title, url, source_domain, extracted_text, detected_links, status")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return rows;
}

const impacts = await fetchAllImpacts();

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = `scripts/backups/press_impacts_before_classification_rebuild_${stamp}.json`;

fs.writeFileSync(backupPath, JSON.stringify(impacts, null, 2));
console.log(`Backup creat: ${backupPath}`);

let updated = 0;
let pending = 0;

for (const impact of impacts) {
  const detected = detectFromImpact(impact);

  if (detected.mediaName === "Mitjà pendent") pending++;

  const patch = {
    media_name: detected.mediaName,
    media_type: detected.mediaType,
    updated_at: new Date().toISOString(),
  };

  if (RESET_STATUS && impact.status !== "arxivat") {
    patch.status = "pendent";
  }

  const { error } = await supabase
    .from("press_impacts")
    .update(patch)
    .eq("id", impact.id);

  if (error) throw error;

  updated++;
}

console.log(`Impactes recalculats: ${updated}`);
console.log(`Impactes amb Mitjà pendent: ${pending}`);
