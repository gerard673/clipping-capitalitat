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
    sourceDomain: row.source_domain ?? undefined,
    amd: row.amd ?? undefined,
    tmu: row.tmu ?? undefined,
    detectedLinks: row.detected_links ?? [],
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

export async function importSampleImpactsForRecullToSupabase(
  sampleImpacts: AnyImpact[],
  recullId: string,
  pageImages: Record<number, string>,
) {
  const rows = sampleImpacts.map((impact) => {
    return impactToDbInsert(
      {
        ...impact,
        pageImage: pageImages[impact.pdfPageStart] ?? null,
      },
      recullId,
    );
  });

  const { error } = await supabase
    .from("press_impacts")
    .insert(rows);

  if (error) throw error;

  return fetchImpactsFromSupabase();
}

export async function importPdfPagesAsImpactsToSupabase(
  recullId: string,
  recullTitle: string,
  pageImages: Record<number, string>,
) {
  const rows = Object.entries(pageImages).map(([pageNumber, imageUrl]) => {
    const page = Number(pageNumber);

    return {
      recull_id: recullId,
      pdf_page_start: page,
      pdf_page_end: null,

      media_type: "PENDENT",
      media_name: "Pendent de detectar",
      title: `Pàgina ${page} pendent de classificar`,
      published_at: "",
      author: null,
      section: null,
      country: null,
      page_number: null,
      frequency: null,

      diffusion: null,
      ots: null,
      ave: null,
      area: null,

      url: null,
      audience_daily: null,
      audience_monthly: null,
      economic_daily: null,
      economic_monthly: null,

      campaign: "Pendent",
      topic: "Pendent",
      territory: "Pendent",
      language: "Pendent",
      importance: "mitjana",
      status: "pendent",

      notes: `Fitxa creada automàticament des del recull: ${recullTitle}`,
      summary: "Pàgina importada automàticament des del PDF. Cal revisar si és notícia, portada, separador o continuació d’un article.",
      page_image_url: imageUrl,
    };
  });

  const { error } = await supabase
    .from("press_impacts")
    .insert(rows);

  if (error) throw error;

  return fetchImpactsFromSupabase();
}

function cleanText(value: string) {
  return value
    .replaceAll("￾", "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value?: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : null;
}

function findFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match?.[0] ?? null;
}

function findOnlineMediaName(lines: string[]) {
  const urlIndex = lines.findIndex((line) => line.startsWith("http"));

  if (urlIndex > 0) {
    return lines[urlIndex - 1];
  }

  return lines[0] ?? "Mitjà pendent";
}

function findOnlineTitle(lines: string[]) {
  const dateIndex = lines.findIndex((line) =>
    /(Lun|Mar|Mié|Jue|Vie|Sáb|Dom|Dilluns|Dimarts|Dimecres|Dijous|Divendres|Dissabte|Diumenge|Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/i.test(line),
  );

  if (dateIndex >= 0) {
    const possible = lines
      .slice(dateIndex + 1)
      .find((line) => {
        return (
          line.length > 18 &&
          !line.toLowerCase().includes("pulse aquí") &&
          !line.toLowerCase().includes("audiencia") &&
          !line.toLowerCase().includes("valor económico") &&
          !line.toLowerCase().includes("jueves") &&
          !line.toLowerCase().includes("viernes") &&
          !line.toLowerCase().includes("lunes") &&
          !line.toLowerCase().includes("martes") &&
          !line.toLowerCase().includes("miércoles") &&
          !line.toLowerCase().includes("sábado") &&
          !line.toLowerCase().includes("domingo")
        );
      });

    if (possible) return possible;
  }

  return lines.find((line) => line.length > 30 && !line.startsWith("http")) ?? "Títol pendent";
}

function findPrintedTitle(lines: string[]) {
  const ignored = [
    "SECCIÓN:",
    "OTS:",
    "DIFUSIÓN:",
    "FRECUENCIA:",
    "ÁREA:",
    "AVE:",
    "PÁGINAS:",
    "PAÍS:",
    "PREMSA",
    "ONLINE",
  ];

  return (
    lines.find((line) => {
      const upper = line.toUpperCase();
      return line.length > 18 && !ignored.some((item) => upper.includes(item));
    }) ?? "Títol pendent"
  );
}

function detectKnownMedia(text: string) {
  const known = [
    "La Vanguardia",
    "El Periódico de Catalunya",
    "El Periódico",
    "El 9 Nou",
    "La Razón",
    "El Nacional",
    "El Punt Avui",
    "Vogue",
    "Betevé",
    "Barcelona Activa",
    "Europa Press",
    "Gente Digital",
    "NoticiasDe.es",
    "Idealista",
    "Time Out",
    "Núvol",
    "MetaData.cat",
    "Eix Diari",
    "ElBaix.cat",
  ];

  return known.find((name) => text.toLowerCase().includes(name.toLowerCase())) ?? "Mitjà pendent";
}

function detectCampaign(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("llum bcn")) return "Llum BCN";
  if (lower.includes("vogue")) return "Vogue / projecció internacional";
  if (lower.includes("ise") || lower.includes("integrated systems europe")) return "ISE";
  if (lower.includes("voluntaris") || lower.includes("voluntarios")) return "Voluntariat";
  if (lower.includes("gaudí")) return "Any Gaudí / Capitalitat";
  if (lower.includes("open barri") || lower.includes("open house")) return "Open House / Barris";
  if (lower.includes("capital mundial de l’arquitectura") || lower.includes("capital mundial de la arquitectura")) return "Capitalitat general";

  return "Pendent";
}

function detectLanguage(text: string) {
  const lower = text.toLowerCase();

  const catalanHits = ["l’", "dels", "aquest", "aquesta", "ciutat", "catalana", "arquitectura"];
  const spanishHits = ["los", "este", "esta", "ciudad", "arquitectura", "españa", "barcelona"];

  const ca = catalanHits.filter((word) => lower.includes(word)).length;
  const es = spanishHits.filter((word) => lower.includes(word)).length;

  if (ca > es) return "Català";
  if (es > ca) return "Castellà";

  return "Pendent";
}

function detectPageImpact(page: { pageNumber: number; imageUrl: string; text: string }, recullTitle: string) {
  const rawText = page.text ?? "";
  const text = cleanText(rawText);
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const upper = text.toUpperCase();

  const isCover = page.pageNumber === 1 || upper.includes("RECULL DE PREMSA BARCELONA");
  const isSeparator =
    upper === "PREMSA" ||
    upper === "ONLINE" ||
    (upper.length < 40 && (upper.includes("PREMSA") || upper.includes("ONLINE")));

  if (isCover) {
    return {
      media_type: "PENDENT",
      media_name: "Portada",
      title: "Portada del recull",
      status: "arxivat",
      campaign: "Sistema",
      topic: "Portada",
      territory: "—",
      language: "—",
      summary: "Portada del recull. No requereix revisió com a impacte.",
    };
  }

  if (isSeparator) {
    return {
      media_type: "PENDENT",
      media_name: "Separador",
      title: upper.includes("ONLINE") ? "Separador ONLINE" : "Separador PREMSA",
      status: "arxivat",
      campaign: "Sistema",
      topic: "Separador",
      territory: "—",
      language: "—",
      summary: "Pàgina separadora del recull. No requereix revisió com a impacte.",
    };
  }

  const url = findFirstUrl(text);
  const isOnline =
    Boolean(url) ||
    upper.includes("AUDIENCIA DIARIA") ||
    upper.includes("AUDIÈNCIA DIÀRIA") ||
    upper.includes("VALOR ECONÓMICO") ||
    upper.includes("VALOR ECONÒMIC");

  if (isOnline) {
    const audienceDaily = toNumber(text.match(/Audiencia diaria:\s*([\d.,]+)/i)?.[1]);
    const audienceMonthly = toNumber(text.match(/Audiencia mensual.*?:\s*([\d.,]+)/i)?.[1]);
    const economicDaily = toNumber(text.match(/Valor económico diario:\s*([\d.,]+)/i)?.[1]);
    const economicMonthly = toNumber(text.match(/Valor económico mensual.*?:\s*([\d.,]+)/i)?.[1]);

    const title = findOnlineTitle(lines);
    const mediaName = findOnlineMediaName(lines);

    return {
      media_type: "ONLINE",
      media_name: mediaName,
      title,
      status: "pendent",
      url,
      audience_daily: audienceDaily,
      audience_monthly: audienceMonthly,
      economic_daily: economicDaily,
      economic_monthly: economicMonthly,
      campaign: detectCampaign(text),
      topic: "Pendent",
      territory: text.toLowerCase().includes("barcelona") ? "Barcelona" : "Pendent",
      language: detectLanguage(text),
      summary: text.slice(0, 420),
    };
  }

  const mediaName = detectKnownMedia(text);
  const title = findPrintedTitle(lines);

  const ots = toNumber(text.match(/OTS:\s*([\d.,]+)/i)?.[1]);
  const diffusion = toNumber(text.match(/DIFUSIÓN:\s*([\d.,]+)/i)?.[1]);
  const ave = toNumber(text.match(/AVE:\s*([\d.,]+)/i)?.[1]);

  return {
    media_type: "PREMSA",
    media_name: mediaName,
    title,
    status: "pendent",
    ots,
    diffusion,
    ave,
    campaign: detectCampaign(text),
    topic: "Pendent",
    territory: text.toLowerCase().includes("barcelona") ? "Barcelona" : "Pendent",
    language: detectLanguage(text),
    summary: text.slice(0, 420),
  };
}

export async function importDetectedPdfPagesAsImpactsToSupabase(
  recullId: string,
  recullTitle: string,
  pages: { pageNumber: number; imageUrl: string; text: string }[],
) {
  const rows = pages.map((page) => {
    const detected = detectPageImpact(page, recullTitle);

    return {
      recull_id: recullId,
      pdf_page_start: page.pageNumber,
      pdf_page_end: null,

      media_type: detected.media_type,
      media_name: detected.media_name,
      title: detected.title,
      published_at: "",
      author: null,
      section: null,
      country: null,
      page_number: null,
      frequency: null,

      diffusion: detected.diffusion ?? null,
      ots: detected.ots ?? null,
      ave: detected.ave ?? null,
      area: null,

      url: detected.url ?? null,
      audience_daily: detected.audience_daily ?? null,
      audience_monthly: detected.audience_monthly ?? null,
      economic_daily: detected.economic_daily ?? null,
      economic_monthly: detected.economic_monthly ?? null,

      campaign: detected.campaign,
      topic: detected.topic,
      territory: detected.territory,
      language: detected.language,
      importance: "mitjana",
      status: detected.status,

      notes: `Fitxa creada automàticament des del recull: ${recullTitle}`,
      summary: detected.summary,
      page_image_url: page.imageUrl,
      extracted_text: page.text,
    };
  });

  const { error } = await supabase
    .from("press_impacts")
    .insert(rows);

  if (error) throw error;

  return fetchImpactsFromSupabase();
}

function cleanPdfText(value: string) {
  return value
    .replaceAll("￾", "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function parseNumber(value?: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/[^\d]/g, "");
  return cleaned ? Number(cleaned) : null;
}

function firstMatch(text: string, regex: RegExp) {
  return text.match(regex)?.[1]?.trim() ?? null;
}

function findUrlFromPdf(text: string, links: string[]) {
  const annotationLink = links.find((link) => /^https?:\/\//i.test(link));
  if (annotationLink) return annotationLink;

  const visibleHttp = text.match(/https?:\/\/[^\s]+/i)?.[0];
  if (visibleHttp) return visibleHttp;

  const domain = firstMatch(text, /\bURL:\s*([a-z0-9._/-]+\.[a-z]{2,}[^\s]*)/i);
  if (domain) {
    return domain.startsWith("http") ? domain : `https://${domain}`;
  }

  return null;
}

function findSourceDomain(text: string, url: string | null) {
  const visible = firstMatch(text, /\bURL:\s*([a-z0-9._/-]+\.[a-z]{2,}[^\s]*)/i);
  if (visible) return visible.replace(/^https?:\/\//i, "");

  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }

  return null;
}

function extractAuthor(text: string) {
  return (
    firstMatch(text, /\bAUTOR:\s*(.+?)(?=\s+(?:URL:|AMD:|OTS:|TMU:|AVE:|PAÍS:|PAIS:)|$)/i) ??
    firstMatch(text, /\bAutor:\s*(.+?)(?=\s+(?:URL:|AMD:|OTS:|TMU:|AVE:|PAÍS:|PAIS:)|$)/i)
  );
}

function extractCountry(text: string) {
  return firstMatch(text, /\bPA[IÍ]S:\s*([A-Za-zÀ-ÿ ]+?)(?=\s+(?:URL:|AMD:|OTS:|TMU:|AVE:|AUTOR:)|$)/i);
}

function extractDate(text: string) {
  return (
    firstMatch(text, /(\d{1,2}\s+(?:Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre),?\s+\d{4})/i) ??
    firstMatch(text, /(\d{1,2}\/\d{1,2}\/\d{2,4})/)
  );
}

function detectKnownMediaV3(text: string) {
  const known = [
    "La Vanguardia",
    "El Periódico de Catalunya",
    "El Periódico",
    "El 9 Nou",
    "La Razón",
    "El Nacional",
    "El Punt Avui",
    "Vogue",
    "Betevé",
    "Barcelona Activa",
    "Europa Press",
    "Gente Digital",
    "NoticiasDe.es",
    "Idealista",
    "Time Out Barcelona",
    "Time Out",
    "Núvol",
    "MetaData.cat",
    "Eix Diari",
    "ElBaix.cat",
    "catalunyapress.cat",
  ];

  return known.find((name) => text.toLowerCase().includes(name.toLowerCase())) ?? null;
}

function mediaFromOnlineText(text: string, lines: string[], sourceDomain: string | null) {
  const atLine = lines.find((line) => /^@\s*/.test(line));
  if (atLine) return atLine.replace(/^@\s*/, "").trim();

  const known = detectKnownMediaV3(text);
  if (known) return known;

  if (sourceDomain) return sourceDomain;

  return "Mitjà pendent";
}

function isMetricOrHeaderLine(line: string) {
  return /^(URL:|AMD:|PA[IÍ]S:|AVE:|AUTOR:|OTS:|TMU:|Audiencia|Audiència|Valor económico|Valor econòmic|Pulse aqu[ií]|P\.\d+|@)/i.test(line);
}

function findTitle(lines: string[]) {
  const candidates = lines.filter((line) => {
    const clean = line.trim();
    if (clean.length < 18) return false;
    if (isMetricOrHeaderLine(clean)) return false;
    if (/^\d{1,2}\s+(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)/i.test(clean)) return false;
    if (/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo|Dilluns|Dimarts|Dimecres|Dijous|Divendres|Dissabte|Diumenge)/i.test(clean)) return false;
    if (/^https?:\/\//i.test(clean)) return false;
    return true;
  });

  return candidates[0] ?? "Títol pendent";
}

function detectCampaignFromText(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("llum bcn")) return "Llum BCN";
  if (lower.includes("vogue")) return "Vogue / projecció internacional";
  if (lower.includes("ise") || lower.includes("integrated systems europe")) return "ISE";
  if (lower.includes("voluntaris") || lower.includes("voluntarios")) return "Voluntariat";
  if (lower.includes("gaudí")) return "Any Gaudí / Capitalitat";
  if (lower.includes("open barri") || lower.includes("open house")) return "Open House / Barris";
  if (lower.includes("capital mundial de l’arquitectura") || lower.includes("capital mundial de la arquitectura")) return "Capitalitat general";

  return "Pendent";
}

function detectLanguageFromText(text: string) {
  const lower = text.toLowerCase();

  const caHits = [" l’", " d’", " aquest", " aquesta", " ciutat", " catalana", " també", " amb ", " dels "];
  const esHits = [" los ", " este ", " esta ", " ciudad", " española", " también", " con ", " del "];

  const ca = caHits.filter((word) => lower.includes(word)).length;
  const es = esHits.filter((word) => lower.includes(word)).length;

  if (ca > es) return "Català";
  if (es > ca) return "Castellà";

  return "Pendent";
}

function detectPageV3(page: { pageNumber: number; imageUrl: string; text: string; links?: string[] }) {
  const text = cleanPdfText(page.text ?? "");
  const lines = text.split(/\n+/).map((line) => cleanPdfText(line)).filter(Boolean);
  const upper = text.toUpperCase();

  const isCover = page.pageNumber === 1 || upper.includes("RECULL DE PREMSA BARCELONA");
  const isSeparator =
    upper === "PREMSA" ||
    upper === "ONLINE" ||
    (upper.length < 80 && (upper.includes("PREMSA") || upper.includes("ONLINE")));

  if (isCover) {
    return {
      media_type: "PENDENT",
      media_name: "Portada",
      title: "Portada del recull",
      status: "arxivat",
      campaign: "Sistema",
      topic: "Portada",
      territory: "—",
      language: "—",
      summary: "Portada del recull. No requereix revisió com a impacte.",
      url: null,
      source_domain: null,
    };
  }

  if (isSeparator) {
    return {
      media_type: "PENDENT",
      media_name: "Separador",
      title: upper.includes("ONLINE") ? "Separador ONLINE" : "Separador PREMSA",
      status: "arxivat",
      campaign: "Sistema",
      topic: "Separador",
      territory: "—",
      language: "—",
      summary: "Pàgina separadora del recull. No requereix revisió com a impacte.",
      url: null,
      source_domain: null,
    };
  }

  const links = page.links ?? [];
  const url = findUrlFromPdf(text, links);
  const sourceDomain = findSourceDomain(text, url);

  const hasOnlineHeader =
    /@\s*[A-Z0-9._-]+/i.test(text) ||
    /\bURL:\s*/i.test(text) ||
    /\bAMD:\s*/i.test(text) ||
    /\bTMU:\s*/i.test(text) ||
    /Pulse aqu[ií] para acceder/i.test(text);

  const isOnline =
    Boolean(url) ||
    hasOnlineHeader ||
    /\bAudiencia diaria:\s*/i.test(text) ||
    /\bValor económico diario:\s*/i.test(text);

  const title = findTitle(lines);
  const campaign = detectCampaignFromText(text);
  const language = detectLanguageFromText(text);
  const territory = text.toLowerCase().includes("barcelona") ? "Barcelona" : "Pendent";

  if (isOnline) {
    const mediaName = mediaFromOnlineText(text, lines, sourceDomain);

    return {
      media_type: "ONLINE",
      media_name: mediaName,
      title,
      published_at: extractDate(text) ?? "",
      author: extractAuthor(text),
      country: extractCountry(text),
      status: "pendent",
      url,
      source_domain: sourceDomain,
      amd: parseNumber(firstMatch(text, /\bAMD:\s*([\d.,]+)/i)),
      ots: parseNumber(firstMatch(text, /\bOTS:\s*([\d.,]+)/i)),
      ave: parseNumber(firstMatch(text, /\bAVE:\s*([\d.,]+)/i)),
      tmu: firstMatch(text, /\bTMU:\s*([0-9.,]+\s*min)/i),
      audience_daily: parseNumber(firstMatch(text, /\bAudiencia diaria:\s*([\d.,]+)/i)),
      audience_monthly: parseNumber(firstMatch(text, /\bAudiencia mensual.*?:\s*([\d.,]+)/i)),
      economic_daily: parseNumber(firstMatch(text, /\bValor económico diario:\s*([\d.,]+)/i)),
      economic_monthly: parseNumber(firstMatch(text, /\bValor económico mensual.*?:\s*([\d.,]+)/i)),
      campaign,
      topic: "Pendent",
      territory,
      language,
      summary: text.slice(0, 700),
    };
  }

  const knownMedia = detectKnownMediaV3(text);

  return {
    media_type: "PREMSA",
    media_name: knownMedia ?? "Mitjà pendent",
    title,
    published_at: extractDate(text) ?? "",
    author: extractAuthor(text),
    country: extractCountry(text),
    status: "pendent",
    url,
    source_domain: sourceDomain,
    ots: parseNumber(firstMatch(text, /\bOTS:\s*([\d.,]+)/i)),
    diffusion: parseNumber(firstMatch(text, /\bDIFUSI[ÓO]N:\s*([\d.,]+)/i)),
    ave: parseNumber(firstMatch(text, /\bAVE:\s*([\d.,]+)/i)),
    campaign,
    topic: "Pendent",
    territory,
    language,
    summary: text.slice(0, 700),
  };
}

export async function importDetectedPdfPagesV3ToSupabase(
  recullId: string,
  recullTitle: string,
  pages: { pageNumber: number; imageUrl: string; text: string; links?: string[] }[],
) {
  const rows = pages.map((page) => {
    const detected = detectPageV3(page);

    return {
      recull_id: recullId,
      pdf_page_start: page.pageNumber,
      pdf_page_end: null,

      media_type: detected.media_type,
      media_name: detected.media_name,
      title: detected.title,
      published_at: detected.published_at ?? "",
      author: detected.author ?? null,
      section: null,
      country: detected.country ?? null,
      page_number: null,
      frequency: null,

      diffusion: detected.diffusion ?? null,
      ots: detected.ots ?? null,
      ave: detected.ave ?? null,
      area: null,

      url: detected.url ?? null,
      source_domain: detected.source_domain ?? null,
      amd: detected.amd ?? null,
      tmu: detected.tmu ?? null,
      detected_links: page.links ?? [],

      audience_daily: detected.audience_daily ?? null,
      audience_monthly: detected.audience_monthly ?? null,
      economic_daily: detected.economic_daily ?? null,
      economic_monthly: detected.economic_monthly ?? null,

      campaign: detected.campaign,
      topic: detected.topic,
      territory: detected.territory,
      language: detected.language,
      importance: "mitjana",
      status: detected.status,

      notes: `Fitxa creada automàticament des del recull: ${recullTitle}`,
      summary: detected.summary,
      page_image_url: page.imageUrl,
      extracted_text: page.text,
    };
  });

  const { error } = await supabase
    .from("press_impacts")
    .insert(rows);

  if (error) throw error;

  return fetchImpactsFromSupabase();
}

export async function fetchRecullsFromSupabase() {
  const { data, error } = await supabase
    .from("press_reculls")
    .select(`
      id,
      title,
      period_start,
      period_end,
      pdf_file_url,
      total_pages,
      status,
      created_at,
      press_impacts(id)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((recull: any) => ({
    id: recull.id,
    title: recull.title,
    periodStart: recull.period_start,
    periodEnd: recull.period_end,
    pdfFileUrl: recull.pdf_file_url,
    totalPages: recull.total_pages,
    status: recull.status,
    createdAt: recull.created_at,
    impactCount: recull.press_impacts?.length ?? 0,
  }));
}

export async function updateRecullAfterProcessing(
  recullId: string,
  fields: {
    totalPages?: number;
    status?: string;
  },
) {
  const { error } = await supabase
    .from("press_reculls")
    .update({
      total_pages: fields.totalPages ?? null,
      status: fields.status ?? "processat",
    })
    .eq("id", recullId);

  if (error) throw error;
}
