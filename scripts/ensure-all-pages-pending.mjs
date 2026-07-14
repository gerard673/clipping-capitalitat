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

function pageNumberFromName(name) {
  const match = name.match(/page-(\d+)\.png$/i);
  if (!match) return null;
  return Number(match[1]);
}

async function main() {
  const { data: reculls, error: recullsError } = await supabase
    .from("press_reculls")
    .select("id, title, total_pages")
    .order("created_at", { ascending: true });

  if (recullsError) throw recullsError;

  let created = 0;
  let updated = 0;
  let scannedPngs = 0;

  for (const recull of reculls ?? []) {
    const folder = `reculls/${recull.id}`;

    const { data: files, error: filesError } = await supabase.storage
      .from("press-page-images")
      .list(folder, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" },
      });

    if (filesError) {
      console.warn(`No puc llegir PNGs del recull ${recull.title}:`, filesError.message);
      continue;
    }

    const pngs = (files ?? [])
      .filter((file) => file.name?.toLowerCase().endsWith(".png"))
      .map((file) => ({
        name: file.name,
        pageNumber: pageNumberFromName(file.name),
        path: `${folder}/${file.name}`,
      }))
      .filter((file) => file.pageNumber !== null)
      .sort((a, b) => a.pageNumber - b.pageNumber);

    if (pngs.length === 0) {
      console.log(`Sense PNGs: ${recull.title}`);
      continue;
    }

    console.log(`\n${recull.title}`);
    console.log(`PNGs trobats: ${pngs.length}`);

    const { data: existingImpacts, error: impactsError } = await supabase
      .from("press_impacts")
      .select("id, pdf_page_start, page_image_url, status")
      .eq("recull_id", recull.id);

    if (impactsError) throw impactsError;

    const existingByPage = new Map();

    for (const impact of existingImpacts ?? []) {
      if (!impact.pdf_page_start) continue;

      if (!existingByPage.has(impact.pdf_page_start)) {
        existingByPage.set(impact.pdf_page_start, []);
      }

      existingByPage.get(impact.pdf_page_start).push(impact);
    }

    for (const png of pngs) {
      scannedPngs++;

      const { data: publicData } = supabase.storage
        .from("press-page-images")
        .getPublicUrl(png.path);

      const pageImageUrl = publicData.publicUrl;
      const existingForPage = existingByPage.get(png.pageNumber) ?? [];

      if (existingForPage.length > 0) {
        const ids = existingForPage.map((impact) => impact.id);

        const { error: updateError } = await supabase
          .from("press_impacts")
          .update({
            status: "pendent",
            page_image_url: pageImageUrl,
            updated_at: new Date().toISOString(),
          })
          .in("id", ids);

        if (updateError) throw updateError;

        updated += ids.length;
      } else {
        const { error: insertError } = await supabase
          .from("press_impacts")
          .insert({
            recull_id: recull.id,
            pdf_page_start: png.pageNumber,
            pdf_page_end: png.pageNumber,
            media_type: "pendent",
            media_name: "Pendent de revisar",
            title: `Pàgina ${png.pageNumber} pendent de revisar`,
            status: "pendent",
            importance: "mitjana",
            page_image_url: pageImageUrl,
            notes: "Pàgina generada automàticament a partir del PNG del recull.",
          });

        if (insertError) throw insertError;

        created++;
      }
    }
  }

  console.log("\n--- RESULTAT ---");
  console.log(`PNGs revisats: ${scannedPngs}`);
  console.log(`Impactes creats: ${created}`);
  console.log(`Impactes actualitzats a pendent: ${updated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
