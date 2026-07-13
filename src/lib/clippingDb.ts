import { supabase } from "@/lib/supabase";

type AnyImpact = Record<string, any>;

function dbToImpact(row: any): AnyImpact {
  return {
    id: row.id,
    recull: row.press_reculls?.title ?? "Recull importat",
    pdfPageStart: row.pdf_page_start,
    pdfPageEnd: row.pdf_page_end ?? undefined,
    mediaType: row.media_type,
    mediaName: row.media_name,
    title: row.title,
    publishedAt: row.published_at,
    author: row.author ?? undefined,
    section: row.section ?? undefined,
    country: row.country ?? undefined,
    pageNumber: row.page_number ?? undefined,
    frequency: row.frequency ?? undefined,
    diffusion: row.diffusion ?? undefined,
    ots: row.ots ?? undefined,
    ave: row.ave ?? undefined,
    area: row.area ?? undefined,
    url: row.url ?? undefined,
    audienceDaily: row.audience_daily ?? undefined,
    audienceMonthly: row.audience_monthly ?? undefined,
    economicDaily: row.economic_daily ?? undefined,
    economicMonthly: row.economic_monthly ?? undefined,
    campaign: row.campaign ?? "",
    topic: row.topic ?? "",
    territory: row.territory ?? "",
    language: row.language ?? "",
    importance: row.importance ?? "mitjana",
    status: row.status ?? "pendent",
    notes: row.notes ?? "",
    summary: row.summary ?? "",
    pageImage: row.page_image_url ?? undefined,
  };
}

function impactToDbInsert(impact: AnyImpact, recullId: string) {
  return {
    recull_id: recullId,
    pdf_page_start: impact.pdfPageStart,
    pdf_page_end: impact.pdfPageEnd ?? null,
    media_type: impact.mediaType,
    media_name: impact.mediaName,
    title: impact.title,
    published_at: impact.publishedAt,
    author: impact.author ?? null,
    section: impact.section ?? null,
    country: impact.country ?? null,
    page_number: impact.pageNumber ?? null,
    frequency: impact.frequency ?? null,
    diffusion: impact.diffusion ?? null,
    ots: impact.ots ?? null,
    ave: impact.ave ?? null,
    area: impact.area ?? null,
    url: impact.url ?? null,
    audience_daily: impact.audienceDaily ?? null,
    audience_monthly: impact.audienceMonthly ?? null,
    economic_daily: impact.economicDaily ?? null,
    economic_monthly: impact.economicMonthly ?? null,
    campaign: impact.campaign,
    topic: impact.topic,
    territory: impact.territory,
    language: impact.language,
    importance: impact.importance,
    status: impact.status,
    notes: impact.notes,
    summary: impact.summary,
    page_image_url: impact.pageImage ?? null,
  };
}

function partialImpactToDb(fields: AnyImpact) {
  const map: Record<string, string> = {
    pdfPageStart: "pdf_page_start",
    pdfPageEnd: "pdf_page_end",
    mediaType: "media_type",
    mediaName: "media_name",
    publishedAt: "published_at",
    pageNumber: "page_number",
    audienceDaily: "audience_daily",
    audienceMonthly: "audience_monthly",
    economicDaily: "economic_daily",
    economicMonthly: "economic_monthly",
    pageImage: "page_image_url",
  };

  const dbFields: AnyImpact = {};

  for (const [key, value] of Object.entries(fields)) {
    dbFields[map[key] ?? key] = value;
  }

  dbFields.updated_at = new Date().toISOString();

  return dbFields;
}

export async function fetchImpactsFromSupabase() {
  const { data, error } = await supabase
    .from("press_impacts")
    .select("*, press_reculls(title)")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(dbToImpact);
}

export async function importSampleImpactsToSupabase(sampleImpacts: AnyImpact[]) {
  const { data: recull, error: recullError } = await supabase
    .from("press_reculls")
    .insert({
      title: "Recull de premsa · 19–31 gener",
      period_start: "2026-01-19",
      period_end: "2026-01-31",
      total_pages: 48,
      status: "importat",
    })
    .select("id")
    .single();

  if (recullError) throw recullError;

  const rows = sampleImpacts.map((impact) => impactToDbInsert(impact, recull.id));

  const { error: impactsError } = await supabase
    .from("press_impacts")
    .insert(rows);

  if (impactsError) throw impactsError;

  return fetchImpactsFromSupabase();
}

export async function updateImpactInSupabase(id: string, fields: AnyImpact) {
  return supabase
    .from("press_impacts")
    .update(partialImpactToDb(fields))
    .eq("id", id);
}

export async function uploadPdfRecullToSupabase(file: File) {
  const safeName = file.name
    .toLowerCase()
    .replaceAll(" ", "-")
    .replace(/[^a-z0-9._-]/g, "");

  const path = `reculls/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("press-pdfs")
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from("press-pdfs")
    .getPublicUrl(path);

  const { data: recull, error: recullError } = await supabase
    .from("press_reculls")
    .insert({
      title: file.name.replace(".pdf", ""),
      pdf_file_url: publicUrlData.publicUrl,
      status: "pdf_pujat",
    })
    .select("id, title, pdf_file_url")
    .single();

  if (recullError) throw recullError;

  return recull;
}
