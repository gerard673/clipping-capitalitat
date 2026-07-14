import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const ids = [
  "1324b9c6-c886-44a2-b159-1eafc688403b",
  "8b0c8ddf-f170-4843-8075-8104706eafe8",
  "b12f22d6-4318-4c5a-954f-d78abe9ca281",
  "121b1ef0-f577-45f5-aed1-d7624bec1d35",
];

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

function pathFromPublicUrl(publicUrl, bucket) {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function removeFolder(bucket, folder) {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
  });

  if (error) {
    console.warn(`No puc llistar ${bucket}/${folder}:`, error.message);
    return;
  }

  const paths = (data ?? [])
    .filter((item) => item.name)
    .map((item) => `${folder}/${item.name}`);

  if (paths.length === 0) {
    console.log(`Cap fitxer a ${bucket}/${folder}`);
    return;
  }

  const { error: removeError } = await supabase.storage.from(bucket).remove(paths);

  if (removeError) {
    console.warn(`No puc eliminar ${bucket}/${folder}:`, removeError.message);
    return;
  }

  console.log(`Eliminats ${paths.length} fitxers de ${bucket}/${folder}`);
}

async function removeExactPath(bucket, path) {
  if (!path) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.warn(`No puc eliminar ${bucket}/${path}:`, error.message);
  } else {
    console.log(`Eliminat ${bucket}/${path}`);
  }
}

for (const id of ids) {
  console.log(`\n--- Eliminant storage del recull ${id} ---`);

  const { data: recull, error } = await supabase
    .from("press_reculls")
    .select("id, pdf_file_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.warn(`No puc llegir el recull ${id}:`, error.message);
  }

  const pdfPath = pathFromPublicUrl(recull?.pdf_file_url, "press-pdfs");

  await removeExactPath("press-pdfs", pdfPath);
  await removeFolder("press-pdfs", `reculls/${id}`);
  await removeFolder("press-page-images", `reculls/${id}`);
}

console.log("\nStorage acabat.");
