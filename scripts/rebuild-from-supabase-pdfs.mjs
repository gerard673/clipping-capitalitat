import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

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

function titleFromPath(filePath) {
  return path.basename(filePath).replace(/\.pdf$/i, "");
}

function getPageCount(pdfPath) {
  const output = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const match = output.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`No puc detectar pàgines de ${pdfPath}`);
  return Number(match[1]);
}

function extractPageText(pdfPath, pageNumber) {
  try {
    return execFileSync(
      "pdftotext",
      ["-f", String(pageNumber), "-l", String(pageNumber), "-layout", pdfPath, "-"],
      { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 },
    ).trim();
  } catch {
    return "";
  }
}

function renderPageToPng(pdfPath, pageNumber, outputDir) {
  const prefix = path.join(outputDir, `page-${String(pageNumber).padStart(3, "0")}`);

  execFileSync("pdftoppm", [
    "-png",
    "-f", String(pageNumber),
    "-l", String(pageNumber),
    "-r", "120",
    pdfPath,
    prefix,
  ]);

  const candidates = fs.readdirSync(outputDir)
    .filter((name) => name.startsWith(`page-${String(pageNumber).padStart(3, "0")}`) && name.endsWith(".png"))
    .map((name) => path.join(outputDir, name));

  if (!candidates[0]) throw new Error(`No s'ha generat PNG per la pàgina ${pageNumber}`);
  return candidates[0];
}

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

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;

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

async function removeAllPageImages() {
  async function listAll(prefix = "") {
    const paths = [];
    const { data, error } = await supabase.storage.from("press-page-images").list(prefix, { limit: 1000 });

    if (error) {
      console.warn("No s'han pogut llistar PNGs:", error.message);
      return paths;
    }

    for (const item of data || []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.name.toLowerCase().endsWith(".png")) {
        paths.push(fullPath);
      } else if (!item.name.includes(".")) {
        paths.push(...await listAll(fullPath));
      }
    }

    return paths;
  }

  const paths = await listAll();

  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await supabase.storage.from("press-page-images").remove(chunk);
    if (error) throw error;
  }

  console.log(`PNGs eliminats: ${paths.length}`);
}

async function resetDatabaseButKeepPdfs() {
  fs.mkdirSync("scripts/backups", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const reculls = await fetchAll("press_reculls");
  const impacts = await fetchAll("press_impacts");

  fs.writeFileSync(`scripts/backups/backup_reculls_before_rebuild_${stamp}.json`, JSON.stringify(reculls, null, 2));
  fs.writeFileSync(`scripts/backups/backup_impacts_before_rebuild_${stamp}.json`, JSON.stringify(impacts, null, 2));

  await removeAllPageImages();

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

  console.log("Base de dades netejada. PDFs conservats.");
}

async function downloadPdf(storagePath, tmpPath) {
  const { data, error } = await supabase.storage.from("press-pdfs").download(storagePath);
  if (error) throw error;

  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
}

async function uploadPng(storagePath, pngPath) {
  const buffer = fs.readFileSync(pngPath);

  const { error } = await supabase.storage
    .from("press-page-images")
    .upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("press-page-images").getPublicUrl(storagePath);
  return data.publicUrl;
}

async function importPdfFromStorage(storagePath) {
  const title = titleFromPath(storagePath);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "clipping-rebuild-"));
  const localPdf = path.join(tmpDir, path.basename(storagePath));

  console.log("");
  console.log(`Important: ${storagePath}`);

  await downloadPdf(storagePath, localPdf);

  const totalPages = getPageCount(localPdf);
  const { data: pdfUrlData } = supabase.storage.from("press-pdfs").getPublicUrl(storagePath);

  const { data: recull, error: recullError } = await supabase
    .from("press_reculls")
    .insert({
      title,
      pdf_file_url: pdfUrlData.publicUrl,
      total_pages: totalPages,
      status: "importat",
    })
    .select("id")
    .single();

  if (recullError) throw recullError;

  for (let page = 1; page <= totalPages; page++) {
    console.log(`  Pàgina ${page}/${totalPages}`);

    const text = extractPageText(localPdf, page);
    const pngPath = renderPageToPng(localPdf, page, tmpDir);

    const pageStoragePath = `reculls/${recull.id}/page-${String(page).padStart(3, "0")}.png`;
    const imageUrl = await uploadPng(pageStoragePath, pngPath);

    const { error: impactError } = await supabase
      .from("press_impacts")
      .insert({
        recull_id: recull.id,
        pdf_page_start: page,
        pdf_page_end: page,
        media_type: "PENDENT",
        media_name: "Mitjà pendent",
        title: "Títol pendent",
        status: "pendent",
        importance: "mitjana",
        page_image_url: imageUrl,
        extracted_text: text,
        detected_links: [],
      });

    if (impactError) throw impactError;
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

const pdfs = await listRecursive("press-pdfs");

console.log(`PDFs trobats a Supabase: ${pdfs.length}`);

if (pdfs.length === 0) {
  throw new Error("No he trobat cap PDF al bucket press-pdfs.");
}

await resetDatabaseButKeepPdfs();

for (const pdf of pdfs) {
  await importPdfFromStorage(pdf);
}

console.log("");
console.log("REBUILD COMPLET.");
console.log("PDFs conservats, reculls i impactes recreats des de zero.");
