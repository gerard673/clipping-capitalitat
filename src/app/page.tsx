"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchImpactsFromSupabase, importSampleImpactsToSupabase, updateImpactInSupabase, uploadPdfRecullToSupabase, importDetectedPdfPagesV3ToSupabase, fetchRecullsFromSupabase, updateRecullAfterProcessing } from "@/lib/clippingDb";
import { renderAndUploadPdfPages } from "@/lib/pdfPages";

type Status = "pendent" | "revisat" | "validat" | "arxivat";
type MediaType = "PREMSA" | "ONLINE" | "PENDENT";
type View = "reculls" | "revisio" | "cataleg" | "informe";

type PressRecull = {
  id: string;
  title: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  pdfFileUrl?: string | null;
  totalPages?: number | null;
  status?: string | null;
  createdAt?: string | null;
  impactCount: number;
};

type Impact = {
  id: string;
  recull: string;
  pdfPageStart: number;
  pdfPageEnd?: number;
  mediaType: MediaType;
  mediaName: string;
  title: string;
  publishedAt: string;
  author?: string;
  section?: string;
  country?: string;
  pageNumber?: string;
  frequency?: string;
  diffusion?: number;
  ots?: number;
  ave?: number;
  area?: string;
  url?: string;
  audienceDaily?: number;
  audienceMonthly?: number;
  economicDaily?: number;
  economicMonthly?: number;
  campaign: string;
  topic: string;
  territory: string;
  language: string;
  importance: "baixa" | "mitjana" | "alta";
  status: Status;
  notes: string;
  summary: string;
  pageImage?: string;
  sourceDomain?: string;
  amd?: number;
  tmu?: string;
  detectedLinks?: string[];
};

const sampleImpacts: Impact[] = [
  {
    id: "imp_001",
    recull: "Recull de premsa · 19–31 gener",
    pdfPageStart: 3,
    mediaType: "PREMSA",
    mediaName: "La Razón Catalunya",
    title: "Albert Serra presenta una obra inédita en el festival LlumBCN",
    publishedAt: "23/01/2026",
    author: "V. Fernández",
    section: "Cataluña",
    country: "España",
    pageNumber: "44",
    frequency: "Diario",
    diffusion: 0,
    ots: 5000,
    ave: 5580,
    area: "601 cm² · 58%",
    campaign: "Llum BCN",
    topic: "Programació cultural",
    territory: "Barcelona",
    language: "Castellà",
    importance: "alta",
    status: "pendent",
    notes: "",
    summary:
      "Peça sobre la 15a edició del festival Llum BCN, amb menció a Albert Serra, Laia Estruch i la vinculació amb la Capital Mundial de l’Arquitectura.",
  },
  {
    id: "imp_002",
    recull: "Recull de premsa · 19–31 gener",
    pdfPageStart: 4,
    mediaType: "PREMSA",
    mediaName: "La Vanguardia",
    title: "Albert Serra será la estrella del Llum BCN en una de sus ediciones más ambiciosas",
    publishedAt: "23/01/2026",
    author: "Teresa Sesé",
    section: "Cultura",
    country: "España",
    pageNumber: "46",
    frequency: "Diario",
    diffusion: 63713,
    ots: 361000,
    ave: 44280,
    area: "816 cm² · 72%",
    campaign: "Llum BCN",
    topic: "Programació cultural",
    territory: "Barcelona",
    language: "Castellà",
    importance: "alta",
    status: "pendent",
    notes: "",
    summary:
      "Article extens sobre Llum BCN 2026 i la seva connexió amb la Capital Mundial de l’Arquitectura.",
  },
  {
    id: "imp_003",
    recull: "Recull de premsa · 19–31 gener",
    pdfPageStart: 7,
    mediaType: "PREMSA",
    mediaName: "El Periódico de Catalunya",
    title: "‘Vogue’ dedica la portada a la capital catalana",
    publishedAt: "21/01/2026",
    author: "Laura Estirado",
    section: "Cultura",
    country: "España",
    pageNumber: "41",
    frequency: "Diario",
    diffusion: 26133,
    ots: 161000,
    ave: 11424,
    area: "298 cm² · 28%",
    campaign: "Any Gaudí / Capitalitat",
    topic: "Projecció internacional",
    territory: "Barcelona",
    language: "Català",
    importance: "alta",
    status: "revisat",
    notes: "",
    summary:
      "Impacte sobre el número especial de Vogue dedicat a Barcelona en el context de l’Any Gaudí i la Capital Mundial de l’Arquitectura.",
  },
  {
    id: "imp_004",
    recull: "Recull de premsa · 19–31 gener",
    pdfPageStart: 12,
    pdfPageEnd: 14,
    mediaType: "ONLINE",
    mediaName: "Núvol",
    title: "Llum BCN, canvi d’etapa",
    publishedAt: "26/01/2026",
    section: "Arquitectura",
    url: "https://www.nuvol.com/art/arquitectura/llum-bcn-canvi-detapa-469982",
    campaign: "Llum BCN",
    topic: "Festival / Capitalitat",
    territory: "Barcelona",
    language: "Català",
    importance: "alta",
    status: "pendent",
    notes: "Article llarg de diverses pàgines del PDF.",
    summary:
      "Article digital sobre Llum BCN 2026, Maria Güell, la Capital Mundial de l’Arquitectura i el programa expandit als districtes.",
  },
  {
    id: "imp_005",
    recull: "Recull de premsa · 19–31 gener",
    pdfPageStart: 24,
    mediaType: "ONLINE",
    mediaName: "Betevé",
    title: "Barcelona exhibeix a l’ISE el potencial del sector audiovisual local",
    publishedAt: "30/01/2026",
    url: "https://beteve.cat/economia/barcelona-exhibeix-ise-potencial-creatiu-tecnologic-sector-audiovisual-local/",
    audienceDaily: 59539,
    audienceMonthly: 654097,
    economicDaily: 268,
    economicMonthly: 3021,
    campaign: "ISE",
    topic: "Sector audiovisual",
    territory: "Barcelona",
    language: "Català",
    importance: "mitjana",
    status: "pendent",
    notes: "",
    summary:
      "Impacte digital sobre la presència de Barcelona a l’ISE i el potencial creatiu i tecnològic local.",
  },
  {
    id: "imp_006",
    recull: "Recull de premsa · 19–31 gener",
    pdfPageStart: 25,
    mediaType: "ONLINE",
    mediaName: "Betevé",
    title: "Barcelona Capital Mundial de l’Arquitectura busca voluntaris",
    publishedAt: "29/01/2026",
    url: "https://beteve.cat/cultura/barcelona-capital-arquitectura-voluntaris/",
    audienceDaily: 59539,
    audienceMonthly: 654097,
    economicDaily: 268,
    economicMonthly: 3021,
    campaign: "Voluntariat",
    topic: "Participació ciutadana",
    territory: "Barcelona",
    language: "Català",
    importance: "alta",
    status: "pendent",
    notes: "",
    summary:
      "Notícia sobre la cerca de voluntaris per a les 1.500 activitats de Barcelona 2026 Capital Mundial de l’Arquitectura.",
  },
  {
    id: "imp_007",
    recull: "Recull de premsa · 19–31 gener",
    pdfPageStart: 41,
    mediaType: "ONLINE",
    mediaName: "Idealista",
    title: "Barcelona, capital de l’arquitectura i altres oportunitats encara pendents",
    publishedAt: "22/01/2026",
    url: "https://www.idealista.com/ca/news/immobiliari/vivienda/2026/01/21/880062-barcelona-capital-de-l-arquitectura-i-altres-oportunitats-encara-pendents",
    audienceDaily: 1212850,
    audienceMonthly: 10346139,
    economicDaily: 48830,
    economicMonthly: 183795,
    campaign: "Capitalitat general",
    topic: "Habitatge / ciutat",
    territory: "Barcelona",
    language: "Català",
    importance: "alta",
    status: "pendent",
    notes: "",
    summary:
      "Article d’opinió sobre la capitalitat arquitectònica de Barcelona i oportunitats urbanes pendents.",
  },
];

function money(value?: number) {
  if (!value && value !== 0) return "—";
  return new Intl.NumberFormat("ca-ES").format(value);
}

function euros(value?: number) {
  if (!value && value !== 0) return "—";
  return `${new Intl.NumberFormat("ca-ES").format(value)} €`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export default function Home() {
  const [view, setView] = useState<View>("reculls");
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [reculls, setReculls] = useState<PressRecull[]>([]);

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");

  const [reportType, setReportType] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportCampaign, setReportCampaign] = useState("");
  const [reportTerritory, setReportTerritory] = useState("");
  const [reportLanguage, setReportLanguage] = useState("");
  const [reportImportance, setReportImportance] = useState("");
  const [reportMedia, setReportMedia] = useState("");

  const [archiveMode, setArchiveMode] = useState<"table" | "cards">("table");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveType, setArchiveType] = useState("");
  const [archiveStatus, setArchiveStatus] = useState("");
  const [archiveCampaign, setArchiveCampaign] = useState("");
  const [archiveImportance, setArchiveImportance] = useState("");

  const campaigns = unique(impacts.map((impact) => impact.campaign));
  const territories = unique(impacts.map((impact) => impact.territory));
  const languages = unique(impacts.map((impact) => impact.language));
  const mediaNames = unique(impacts.map((impact) => impact.mediaName));

  const filtered = useMemo(() => {
    return impacts.filter((impact) => {
      return (
        (!typeFilter || impact.mediaType === typeFilter) &&
        (!statusFilter || impact.status === statusFilter) &&
        (!campaignFilter || impact.campaign === campaignFilter)
      );
    });
  }, [impacts, typeFilter, statusFilter, campaignFilter]);

  const reportImpacts = useMemo(() => {
    return impacts.filter((impact) => {
      return (
        (!reportType || impact.mediaType === reportType) &&
        (!reportStatus || impact.status === reportStatus) &&
        (!reportCampaign || impact.campaign === reportCampaign) &&
        (!reportTerritory || impact.territory === reportTerritory) &&
        (!reportLanguage || impact.language === reportLanguage) &&
        (!reportImportance || impact.importance === reportImportance) &&
        (!reportMedia || impact.mediaName === reportMedia)
      );
    });
  }, [impacts, reportType, reportStatus, reportCampaign, reportTerritory, reportLanguage, reportImportance, reportMedia]);

  const archiveImpacts = useMemo(() => {
    const search = archiveSearch.trim().toLowerCase();

    return impacts.filter((impact) => {
      const matchesSearch =
        !search ||
        [
          impact.title,
          impact.mediaName,
          impact.campaign,
          impact.topic,
          impact.territory,
          impact.url ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      return (
        matchesSearch &&
        (!archiveType || impact.mediaType === archiveType) &&
        (!archiveStatus || impact.status === archiveStatus) &&
        (!archiveCampaign || impact.campaign === archiveCampaign) &&
        (!archiveImportance || impact.importance === archiveImportance)
      );
    });
  }, [impacts, archiveSearch, archiveType, archiveStatus, archiveCampaign, archiveImportance]);

  const reviewQueue = useMemo(() => {
    return impacts.filter((impact) => impact.status !== "validat" && impact.status !== "arxivat");
  }, [impacts]);

  const selected =
    impacts.find((impact) => impact.id === selectedId) ??
    filtered[0] ??
    impacts[0];

  const archiveSelected =
    selected && archiveImpacts.some((impact) => impact.id === selected.id)
      ? selected
      : archiveImpacts[0];

  const reviewSelected =
    reviewQueue.find((impact) => impact.id === selectedId) ??
    reviewQueue[0];

  const totalAve = reportImpacts.reduce((sum, impact) => sum + (impact.ave ?? 0), 0);
  const totalEconomicMonthly = reportImpacts.reduce((sum, impact) => sum + (impact.economicMonthly ?? 0), 0);
  const totalAudience = reportImpacts.reduce((sum, impact) => sum + (impact.audienceMonthly ?? 0), 0);
  const totalOts = reportImpacts.reduce((sum, impact) => sum + (impact.ots ?? 0), 0);
  const totalDiffusion = reportImpacts.reduce((sum, impact) => sum + (impact.diffusion ?? 0), 0);

  useEffect(() => {
    let cancelled = false;

    fetchImpactsFromSupabase()
      .then((data) => {
        if (cancelled) return;
        setImpacts(data as Impact[]);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((error) => {
        console.error("Error carregant impactes:", error);
      });

    fetchRecullsFromSupabase()
      .then((data) => {
        if (cancelled) return;
        setReculls(data as PressRecull[]);
      })
      .catch((error) => {
        console.error("Error carregant reculls:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function simulatePdfImport() {
    try {
      const data = await importSampleImpactsToSupabase(sampleImpacts);
      setImpacts(data as Impact[]);
      setSelectedId(data[0]?.id ?? null);
      setView("revisio");
    } catch (error) {
      console.error("Error important recull:", error);
      alert("No s'ha pogut importar el recull a Supabase. Mira la consola.");
    }
  }

  async function updateImpact(id: string, fields: Partial<Impact>) {
    setImpacts((current) =>
      current.map((impact) => (impact.id === id ? { ...impact, ...fields } : impact)),
    );

    const { error } = await updateImpactInSupabase(id, fields);

    if (error) {
      console.error("Error actualitzant impacte:", error);
    }
  }

  function goNextInReview(currentId: string) {
    const next = reviewQueue.find((impact) => impact.id !== currentId);
    setSelectedId(next?.id ?? null);
  }

  function validateReview() {
    if (!reviewSelected) return;
    updateImpact(reviewSelected.id, { status: "validat" });
    goNextInReview(reviewSelected.id);
  }

  function archiveReview() {
    if (!reviewSelected) return;
    updateImpact(reviewSelected.id, { status: "arxivat" });
    goNextInReview(reviewSelected.id);
  }

  function skipReview() {
    if (!reviewSelected) return;
    const currentIndex = reviewQueue.findIndex((impact) => impact.id === reviewSelected.id);
    const next = reviewQueue[currentIndex + 1] ?? reviewQueue[0];
    setSelectedId(next?.id ?? null);
  }

  async function uploadRealPdf() {
    if (!pdfFile) {
      setUploadMessage("Selecciona primer un PDF.");
      return;
    }

    try {
      setUploadMessage("Pujant PDF a Supabase...");
      const recull = await uploadPdfRecullToSupabase(pdfFile);

      setUploadMessage("PDF pujat. Convertint pàgines en imatges...");
      const pages = await renderAndUploadPdfPages(pdfFile, recull.id);

      setUploadMessage("Imatges i text extrets. Detectant mitjà, títol, URL i tipus de peça...");
      const data = await importDetectedPdfPagesV3ToSupabase(recull.id, recull.title, pages);

      setImpacts(data as Impact[]);
      setSelectedId(data[0]?.id ?? null);
      setView("revisio");

      const updatedReculls = await fetchRecullsFromSupabase();
      setReculls(updatedReculls as PressRecull[]);

      setUploadMessage(`PDF processat correctament: ${recull.title}`);
    } catch (error) {
      console.error("Error processant PDF:", error);
      setUploadMessage("No s'ha pogut processar el PDF. Revisa bucket, polítiques o consola.");
    }
  }

  function exportReportCsv() {
    const headers = [
      "pagina",
      "estat",
      "mitja",
      "titol",
      "tipus",
      "campanya",
      "tema",
      "territori",
      "idioma",
      "importancia",
      "url",
      "ots",
      "amd",
      "ave",
      "audiencia_mensual",
      "valor_mensual",
    ];

    const rows = reportImpacts.map((impact) => [
      impact.pdfPageStart,
      impact.status,
      impact.mediaName,
      impact.title,
      impact.mediaType,
      impact.campaign,
      impact.topic,
      impact.territory,
      impact.language,
      impact.importance,
      impact.url ?? "",
      impact.ots ?? "",
      impact.amd ?? "",
      impact.ave ?? "",
      impact.audienceMonthly ?? "",
      impact.economicMonthly ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = "informe-clipping-capitalitat.csv";
    element.click();
    URL.revokeObjectURL(url);
  }

  function clearDemo() {
    setImpacts([]);
    setSelectedId(null);
    setView("reculls");
  }

  return (
    <div className="desktop">
      <div className="window">
        <div className="browser">
          <div className="dots"><span /><span /><span /></div>
          <div className="address">capitalitat.local / press-clipping / pdf-import</div>
          <div className="browserRight">PDF → IMPACTES → REVISIÓ → INFORME</div>
        </div>

        <header className="top">
          <div className="brand">
            <div className="logo">A</div>
            <div>
              <b>CLIPPING CAPITALITAT</b>
              <span>Reculls de premsa · Barcelona 2026</span>
            </div>
          </div>

          <nav className="tabs">
            {[
              ["reculls", "Reculls"],
              ["revisio", `Revisió (${reviewQueue.length})`],
              ["cataleg", "Catàleg"],
              ["informe", "Informe"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id as View)}
                className={view === id ? "active" : ""}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className={view === "informe" || view === "cataleg" || view === "reculls" ? "content reportMode" : "content"}>
          <aside className="left">
            <div className="panelHead">
              <h2>Impactes detectats</h2>
              <span>{filtered.length}</span>
            </div>

            <div className="filters">
              <label>Tipus</label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">Tots</option>
                <option value="PENDENT">PENDENT</option>
                <option value="PREMSA">PREMSA</option>
                <option value="ONLINE">ONLINE</option>
              </select>

              <label>Estat</label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Tots</option>
                <option value="pendent">Pendent</option>
                <option value="revisat">Revisat</option>
                <option value="validat">Validat</option>
                <option value="arxivat">Arxivat</option>
              </select>

              <label>Campanya</label>
              <select value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
                <option value="">Totes</option>
                {campaigns.map((campaign) => (
                  <option key={campaign}>{campaign}</option>
                ))}
              </select>
            </div>

            <div className="impactList">
              {filtered.length === 0 ? (
                <div className="empty">Encara no hi ha impactes. Importa un recull PDF.</div>
              ) : (
                filtered.map((impact) => (
                  <button
                    key={impact.id}
                    className={selected?.id === impact.id ? "impact active" : "impact"}
                    onClick={() => setSelectedId(impact.id)}
                  >
                    <div className="impactTop">
                      <b>{impact.mediaName}</b>
                      <span className={`badge ${impact.status}`}>{impact.status}</span>
                    </div>
                    <strong>{impact.title}</strong>
                    <small>
                      P.{impact.pdfPageStart}
                      {impact.pdfPageEnd ? `–${impact.pdfPageEnd}` : ""} · {impact.mediaType} · {impact.publishedAt}
                    </small>
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="main">
            {view === "reculls" && (
              <section className="importPage">
                <div className="importHero">
                  <div>
                    <p className="kicker">Importar recull</p>
                    <h1>Biblioteca de PDFs de clipping</h1>
                    <p>
                      Puja un recull de premsa en PDF, processa’n les pàgines, extreu captures,
                      text, links i metadades, i conserva tots els reculls importats en un historial.
                    </p>
                  </div>

                  <div className="importHeroStats">
                    <Kpi value={reculls.length} label="Reculls importats" />
                    <Kpi value={reculls.reduce((sum, recull) => sum + recull.impactCount, 0)} label="Impactes totals" />
                  </div>
                </div>

                <div className="importGridNew">
                  <div className="importPanel">
                    <div className="blockTitle">
                      <span>01</span>
                      <h2>Pujar nou PDF</h2>
                    </div>

                    <div className="realUpload refinedUpload">
                      <label>PDF real del recull</label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
                      />

                      {pdfFile && (
                        <div className="selectedFile">
                          <b>{pdfFile.name}</b>
                          <span>{Math.round(pdfFile.size / 1024 / 1024 * 10) / 10} MB</span>
                        </div>
                      )}

                      <button onClick={uploadRealPdf}>Pujar i processar PDF</button>

                      {uploadMessage && <p>{uploadMessage}</p>}
                    </div>

                    <div className="processSteps">
                      <div><span>1</span><b>PDF pujat</b><small>Supabase Storage</small></div>
                      <div><span>2</span><b>Pàgines renderitzades</b><small>PNG per pàgina</small></div>
                      <div><span>3</span><b>Text i links extrets</b><small>PDF.js parser</small></div>
                      <div><span>4</span><b>Fitxes creades</b><small>Revisió editorial</small></div>
                    </div>

                    <div className="fakeUpload compactDemo">
                      <span>Carregar dades demo</span>
                      <button onClick={simulatePdfImport}>Simular importació demo</button>
                    </div>
                  </div>

                  <div className="importPanel">
                    <div className="blockTitle">
                      <span>02</span>
                      <h2>Reculls importats</h2>
                    </div>

                    {reculls.length === 0 ? (
                      <div className="emptyImportList">
                        Encara no hi ha cap PDF importat.
                      </div>
                    ) : (
                      <div className="recullList">
                        {reculls.map((recull, index) => (
                          <article className="recullCard" key={recull.id}>
                            <div className="recullCardIndex">
                              {String(index + 1).padStart(2, "0")}
                            </div>

                            <div className="recullCardBody">
                              <div className="recullCardTop">
                                <span>{recull.status ?? "importat"}</span>
                                <span>{recull.totalPages ?? "—"} pàgines</span>
                                <span>{recull.impactCount} impactes</span>
                              </div>

                              <h3>{recull.title}</h3>

                              <p>
                                Importat el{" "}
                                {recull.createdAt
                                  ? new Date(recull.createdAt).toLocaleDateString("ca-ES")
                                  : "—"}
                              </p>

                              <div className="recullCardActions">
                                {recull.pdfFileUrl ? (
                                  <a href={recull.pdfFileUrl} target="_blank" rel="noreferrer">
                                    Obrir PDF ↗
                                  </a>
                                ) : (
                                  <span>PDF no disponible</span>
                                )}

                                <button
                                  onClick={() => {
                                    setArchiveSearch(recull.title);
                                    setView("cataleg");
                                  }}
                                >
                                  Veure impactes
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {view === "revisio" && (
              <section className="reviewStudio">
                {!reviewSelected ? (
                  <div className="reviewDone">
                    <p className="kicker">Cua de revisió</p>
                    <h1>Revisió completada</h1>
                    <p>
                      No queden impactes pendents. Els impactes validats passen a l’arxiu i als informes.
                    </p>
                    <button onClick={() => setView("cataleg")}>Anar a l’arxiu</button>
                  </div>
                ) : (
                  <>
                    <div className="reviewStudioHeader">
                      <div>
                        <p className="kicker">Revisió editorial</p>
                        <h1>{reviewSelected.title}</h1>
                      </div>

                      <div className="reviewHeaderBadges">
                        <span>P.{reviewSelected.pdfPageStart}</span>
                        <span>{reviewSelected.mediaType}</span>
                        <span className={`badge ${reviewSelected.status}`}>{reviewSelected.status}</span>
                        <span>{reviewQueue.length} pendents</span>
                      </div>
                    </div>

                    <div className="reviewWorkspace">
                      <div className="reviewDocument">
                        <div className="documentToolbar">
                          <div>
                            <b>{reviewSelected.mediaName}</b>
                            <span>
                              {reviewSelected.publishedAt || "Data pendent"} · {reviewSelected.language}
                            </span>
                          </div>

                          <div className="documentActions">
                            {reviewSelected.url && (
                              <a href={reviewSelected.url} target="_blank" rel="noreferrer">
                                Obrir URL ↗
                              </a>
                            )}
                            <button onClick={skipReview}>Saltar</button>
                          </div>
                        </div>

                        <div className="documentFrame">
                          {reviewSelected.pageImage ? (
                            <img
                              src={reviewSelected.pageImage}
                              alt={`Pàgina ${reviewSelected.pdfPageStart} del PDF`}
                            />
                          ) : (
                            <div className="imageMissing">Sense captura de pàgina</div>
                          )}
                        </div>

                        <details className="extractedTextBox">
                          <summary>Text extret / resum automàtic</summary>
                          <p>{reviewSelected.summary}</p>
                        </details>
                      </div>

                      <aside className="reviewInspector">
                        <div className="inspectorBlock">
                          <div className="blockTitle">
                            <span>01</span>
                            <h2>Dades detectades</h2>
                          </div>

                          <div className="detectedGrid">
                            <InfoRow label="Mitjà" value={reviewSelected.mediaName} />
                            <InfoRow label="Tipus" value={reviewSelected.mediaType} />
                            <InfoRow label="Data" value={reviewSelected.publishedAt || "—"} />
                            <InfoRow label="Autor/a" value={reviewSelected.author ?? "—"} />
                            <InfoRow label="País" value={reviewSelected.country ?? "—"} />
                            <InfoRow label="Domini" value={reviewSelected.sourceDomain ?? "—"} />
                            <InfoRow label="OTS" value={money(reviewSelected.ots)} />
                            <InfoRow label="Difusió" value={money(reviewSelected.diffusion)} />
                            <InfoRow label="AVE" value={euros(reviewSelected.ave)} />
                            <InfoRow label="AMD" value={money(reviewSelected.amd)} />
                            <InfoRow label="TMU" value={reviewSelected.tmu ?? "—"} />
                            <InfoRow label="Audiència mensual" value={money(reviewSelected.audienceMonthly)} />
                          </div>

                          <div className="linkBox">
                            <label>URL principal</label>
                            {reviewSelected.url ? (
                              <a href={reviewSelected.url} target="_blank" rel="noreferrer">
                                {reviewSelected.url}
                              </a>
                            ) : (
                              <span>Sense URL detectada</span>
                            )}
                          </div>

                          <div className="linkBox">
                            <label>Links detectats al PDF</label>
                            {(reviewSelected.detectedLinks ?? []).length > 0 ? (
                              <div className="detectedLinks">
                                {(reviewSelected.detectedLinks ?? []).slice(0, 5).map((link) => (
                                  <a key={link} href={link} target="_blank" rel="noreferrer">
                                    {link}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span>Cap link intern detectat</span>
                            )}
                          </div>
                        </div>

                        <div className="inspectorBlock humanBlock">
                          <div className="blockTitle">
                            <span>02</span>
                            <h2>Classificació humana</h2>
                          </div>

                          <label>Tipus de peça</label>
                          <select
                            value={reviewSelected.mediaType}
                            onChange={(e) => updateImpact(reviewSelected.id, { mediaType: e.target.value as MediaType })}
                          >
                            <option value="PENDENT">PENDENT</option>
                            <option value="PREMSA">PREMSA</option>
                            <option value="ONLINE">ONLINE</option>
                          </select>

                          <label>Mitjà</label>
                          <input
                            value={reviewSelected.mediaName}
                            onChange={(e) => updateImpact(reviewSelected.id, { mediaName: e.target.value })}
                          />

                          <label>Títol</label>
                          <textarea
                            className="titleTextarea"
                            value={reviewSelected.title}
                            onChange={(e) => updateImpact(reviewSelected.id, { title: e.target.value })}
                          />

                          <label>Campanya</label>
                          <input
                            value={reviewSelected.campaign}
                            onChange={(e) => updateImpact(reviewSelected.id, { campaign: e.target.value })}
                          />

                          <label>Tema</label>
                          <input
                            value={reviewSelected.topic}
                            onChange={(e) => updateImpact(reviewSelected.id, { topic: e.target.value })}
                          />

                          <div className="twoCols">
                            <div>
                              <label>Territori</label>
                              <input
                                value={reviewSelected.territory}
                                onChange={(e) => updateImpact(reviewSelected.id, { territory: e.target.value })}
                              />
                            </div>

                            <div>
                              <label>Idioma</label>
                              <input
                                value={reviewSelected.language}
                                onChange={(e) => updateImpact(reviewSelected.id, { language: e.target.value })}
                              />
                            </div>
                          </div>

                          <label>Importància</label>
                          <select
                            value={reviewSelected.importance}
                            onChange={(e) => updateImpact(reviewSelected.id, { importance: e.target.value as Impact["importance"] })}
                          >
                            <option value="baixa">baixa</option>
                            <option value="mitjana">mitjana</option>
                            <option value="alta">alta</option>
                          </select>

                          <label>Notes internes</label>
                          <textarea
                            value={reviewSelected.notes}
                            onChange={(e) => updateImpact(reviewSelected.id, { notes: e.target.value })}
                          />
                        </div>
                      </aside>
                    </div>

                    <div className="reviewActionBar">
                      <button onClick={archiveReview}>Descartar</button>
                      <button onClick={skipReview}>Saltar</button>
                      <button onClick={() => updateImpact(reviewSelected.id, { status: "revisat" })}>
                        Marcar revisat
                      </button>
                      <button className="primaryAction" onClick={validateReview}>
                        Validar i següent
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {view === "cataleg" && (
              <section className="archivePage">
                <div className="archiveHero">
                  <div>
                    <p className="kicker">Arxiu viu</p>
                    <h1>Impactes del recull</h1>
                    <p>
                      Consulta, filtra i revisa tots els impactes extrets dels PDFs. Els impactes validats,
                      pendents, descartats o arxivats queden centralitzats en aquesta pantalla.
                    </p>
                  </div>

                  <div className="archiveSwitch">
                    <button
                      className={archiveMode === "table" ? "active" : ""}
                      onClick={() => setArchiveMode("table")}
                    >
                      Taula
                    </button>
                    <button
                      className={archiveMode === "cards" ? "active" : ""}
                      onClick={() => setArchiveMode("cards")}
                    >
                      Visual
                    </button>
                  </div>
                </div>

                <div className="archiveFilters">
                  <div className="archiveSearch">
                    <label>Cerca</label>
                    <input
                      value={archiveSearch}
                      onChange={(event) => setArchiveSearch(event.target.value)}
                      placeholder="Cerca per mitjà, titular, campanya, URL..."
                    />
                  </div>

                  <Filter label="Tipus" value={archiveType} setValue={setArchiveType} options={["PENDENT", "PREMSA", "ONLINE"]} />
                  <Filter label="Estat" value={archiveStatus} setValue={setArchiveStatus} options={["pendent", "revisat", "validat", "arxivat"]} />
                  <Filter label="Campanya" value={archiveCampaign} setValue={setArchiveCampaign} options={campaigns} />
                  <Filter label="Importància" value={archiveImportance} setValue={setArchiveImportance} options={["baixa", "mitjana", "alta"]} />
                </div>

                <div className="archiveKpis">
                  <Kpi value={archiveImpacts.length} label="Impactes visibles" />
                  <Kpi value={archiveImpacts.filter(i => i.status === "validat").length} label="Validats" />
                  <Kpi value={archiveImpacts.filter(i => i.status === "pendent").length} label="Pendents" />
                  <Kpi value={archiveImpacts.filter(i => i.mediaType === "ONLINE").length} label="Online" />
                  <Kpi value={archiveImpacts.filter(i => i.mediaType === "PREMSA").length} label="Premsa" />
                </div>

                {archiveSelected && (
                  <div className="archiveSelected">
                    <div className="archiveSelectedImage">
                      {archiveSelected.pageImage ? (
                        <img src={archiveSelected.pageImage} alt={`Pàgina ${archiveSelected.pdfPageStart}`} />
                      ) : (
                        <span>Sense captura</span>
                      )}
                    </div>

                    <div className="archiveSelectedInfo">
                      <div className="archiveSelectedTop">
                        <span>P.{archiveSelected.pdfPageStart}</span>
                        <span>{archiveSelected.mediaType}</span>
                        <span className={`badge ${archiveSelected.status}`}>{archiveSelected.status}</span>
                      </div>

                      <h2>{archiveSelected.title}</h2>
                      <p>{archiveSelected.summary}</p>

                      <div className="archiveSelectedMeta">
                        <InfoRow label="Mitjà" value={archiveSelected.mediaName} />
                        <InfoRow label="Campanya" value={archiveSelected.campaign} />
                        <InfoRow label="Territori" value={archiveSelected.territory} />
                        <InfoRow label="OTS / AMD" value={money((archiveSelected.ots ?? 0) + (archiveSelected.amd ?? 0))} />
                        <InfoRow label="Valor" value={archiveSelected.mediaType === "PREMSA" ? euros(archiveSelected.ave) : euros(archiveSelected.economicMonthly)} />
                        <InfoRow
                          label="URL"
                          value={
                            archiveSelected.url ? (
                              <a href={archiveSelected.url} target="_blank" rel="noreferrer">obrir notícia ↗</a>
                            ) : (
                              "—"
                            )
                          }
                        />
                      </div>

                      <div className="archiveSelectedActions">
                        <button onClick={() => setView("revisio")}>Anar a revisió</button>
                        <button onClick={() => updateImpact(archiveSelected.id, { status: "pendent" })}>
                          Tornar a cua
                        </button>
                        <button onClick={() => updateImpact(archiveSelected.id, { status: "validat" })}>
                          Validar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {archiveMode === "table" ? (
                  <div className="archiveTable">
                    <div className="tableHeader">
                      <h3>Taula d’impactes</h3>
                      <span>{archiveImpacts.length} registres</span>
                    </div>

                    <table>
                      <thead>
                        <tr>
                          <th>Pàg.</th>
                          <th>Estat</th>
                          <th>Tipus</th>
                          <th>Mitjà</th>
                          <th>Títol</th>
                          <th>Campanya</th>
                          <th>Importància</th>
                          <th>URL</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archiveImpacts.map((impact) => (
                          <tr
                            key={impact.id}
                            className={archiveSelected?.id === impact.id ? "selectedRow" : ""}
                            onClick={() => setSelectedId(impact.id)}
                          >
                            <td>P.{impact.pdfPageStart}</td>
                            <td><span className={`badge ${impact.status}`}>{impact.status}</span></td>
                            <td>{impact.mediaType}</td>
                            <td>{impact.mediaName}</td>
                            <td>{impact.title}</td>
                            <td>{impact.campaign}</td>
                            <td>{impact.importance}</td>
                            <td>
                              {impact.url ? (
                                <a
                                  href={impact.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  obrir ↗
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>{impact.mediaType === "PREMSA" ? euros(impact.ave) : euros(impact.economicMonthly)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="archiveCards">
                    {archiveImpacts.map((impact) => (
                      <button
                        key={impact.id}
                        className={archiveSelected?.id === impact.id ? "archiveCard active" : "archiveCard"}
                        onClick={() => setSelectedId(impact.id)}
                      >
                        <div className="archiveCardImage">
                          {impact.pageImage ? (
                            <img src={impact.pageImage} alt={`Pàgina ${impact.pdfPageStart}`} />
                          ) : (
                            <span>Sense captura</span>
                          )}
                        </div>

                        <div className="archiveCardBody">
                          <div className="archiveCardTop">
                            <span>P.{impact.pdfPageStart}</span>
                            <span>{impact.mediaType}</span>
                            <span className={`badge ${impact.status}`}>{impact.status}</span>
                          </div>

                          <h3>{impact.title}</h3>
                          <p>{impact.mediaName}</p>

                          <div className="archiveCardFooter">
                            <span>{impact.campaign}</span>
                            <b>{impact.importance}</b>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {view === "informe" && (
              <section className="report reportExecutive">
                <div className="reportHero">
                  <div>
                    <p className="kicker">Informe filtrable</p>
                    <h1>Informe del recull</h1>
                    <p>
                      Lectura agregada dels impactes detectats al recull de premsa. Els resultats es poden filtrar
                      per tipus, estat, campanya, territori, idioma, importància i mitjà.
                    </p>
                  </div>

                  <div className="reportHeroActions">
                    <button onClick={exportReportCsv}>Exportar CSV</button>
                    <button onClick={() => setView("revisio")}>Revisar pendents</button>
                  </div>
                </div>

                <div className="reportFilters executiveFilters">
                  <Filter label="Tipus" value={reportType} setValue={setReportType} options={["PENDENT", "PREMSA", "ONLINE"]} />
                  <Filter label="Estat" value={reportStatus} setValue={setReportStatus} options={["pendent", "revisat", "validat", "arxivat"]} />
                  <Filter label="Campanya" value={reportCampaign} setValue={setReportCampaign} options={campaigns} />
                  <Filter label="Territori" value={reportTerritory} setValue={setReportTerritory} options={territories} />
                  <Filter label="Idioma" value={reportLanguage} setValue={setReportLanguage} options={languages} />
                  <Filter label="Importància" value={reportImportance} setValue={setReportImportance} options={["baixa", "mitjana", "alta"]} />
                  <Filter label="Mitjà" value={reportMedia} setValue={setReportMedia} options={mediaNames} />
                </div>

                <div className="executiveKpis">
                  <Kpi value={reportImpacts.length} label="Impactes filtrats" />
                  <Kpi value={reportImpacts.filter(i => i.status === "validat").length} label="Validats" />
                  <Kpi value={reportImpacts.filter(i => i.status === "pendent").length} label="Pendents" />
                  <Kpi value={reportImpacts.filter(i => i.mediaType === "PREMSA").length} label="Premsa" />
                  <Kpi value={reportImpacts.filter(i => i.mediaType === "ONLINE").length} label="Online" />
                  <Kpi value={euros(totalAve)} label="AVE premsa" />
                  <Kpi value={money(totalOts)} label="OTS total" />
                  <Kpi value={money(totalAudience)} label="Audiència mensual" />
                  <Kpi value={money(totalDiffusion)} label="Difusió" />
                  <Kpi value={euros(totalEconomicMonthly)} label="Valor online mensual" />
                </div>

                <div className="reportNarrative">
                  <div className="narrativeMain">
                    <p className="kicker">Lectura automàtica</p>
                    <h2>Resum del període</h2>
                    <p>
                      El recull acumula <b>{reportImpacts.length}</b> impactes filtrats, amb predomini de{" "}
                      <b>{reportImpacts.filter(i => i.mediaType === "ONLINE").length >= reportImpacts.filter(i => i.mediaType === "PREMSA").length ? "mitjans online" : "premsa"}</b>.
                      El valor econòmic agregat detectat és de <b>{euros(totalAve + totalEconomicMonthly)}</b>, combinant AVE de premsa i valor mensual online.
                    </p>
                    <p>
                      La cua de revisió conserva <b>{impacts.filter(i => i.status === "pendent").length}</b> impactes pendents.
                      Els impactes validats ja poden alimentar informes i exportacions.
                    </p>
                  </div>

                  <div className="narrativeSide">
                    <MetricLine label="Validació" value={reportImpacts.length ? Math.round((reportImpacts.filter(i => i.status === "validat").length / reportImpacts.length) * 100) : 0} suffix="%" />
                    <MetricLine label="Online" value={reportImpacts.length ? Math.round((reportImpacts.filter(i => i.mediaType === "ONLINE").length / reportImpacts.length) * 100) : 0} suffix="%" />
                    <MetricLine label="Alta importància" value={reportImpacts.length ? Math.round((reportImpacts.filter(i => i.importance === "alta").length / reportImpacts.length) * 100) : 0} suffix="%" />
                  </div>
                </div>

                <div className="reportColumns">
                  <ReportRanking title="Top impactes per valor" impacts={reportImpacts} mode="value" />
                  <ReportRanking title="Top impactes per abast" impacts={reportImpacts} mode="reach" />
                </div>

                <div className="analysisGrid executiveAnalysis">
                  <AnalysisBlock title="Per campanya" impacts={reportImpacts} groupBy="campaign" />
                  <AnalysisBlock title="Per mitjà" impacts={reportImpacts} groupBy="mediaName" />
                  <AnalysisBlock title="Per territori" impacts={reportImpacts} groupBy="territory" />
                  <AnalysisBlock title="Per idioma" impacts={reportImpacts} groupBy="language" />
                </div>

                <div className="reportColumns">
                  <ReportStatusBlock impacts={reportImpacts} />
                  <ReportTypeBlock impacts={reportImpacts} />
                </div>

                <div className="reportTable executiveTable">
                  <div className="tableHeader">
                    <h3>Taula d’impactes</h3>
                    <span>{reportImpacts.length} registres</span>
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Pàg.</th>
                        <th>Estat</th>
                        <th>Mitjà</th>
                        <th>Títol</th>
                        <th>Tipus</th>
                        <th>Campanya</th>
                        <th>URL</th>
                        <th>OTS / AMD</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportImpacts.map((impact) => (
                        <tr key={impact.id}>
                          <td>P.{impact.pdfPageStart}</td>
                          <td><span className={`badge ${impact.status}`}>{impact.status}</span></td>
                          <td>{impact.mediaName}</td>
                          <td>{impact.title}</td>
                          <td>{impact.mediaType}</td>
                          <td>{impact.campaign}</td>
                          <td>
                            {impact.url ? (
                              <a href={impact.url} target="_blank" rel="noreferrer">obrir ↗</a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>{money((impact.ots ?? 0) + (impact.amd ?? 0))}</td>
                          <td>{impact.mediaType === "PREMSA" ? euros(impact.ave) : euros(impact.economicMonthly)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </main>

          <aside className="right">
            <div className="panelHead">
              <h2>Fitxa detectada</h2>
              <span>{selected ? `P.${selected.pdfPageStart}` : "—"}</span>
            </div>

            {selected ? (
              <div className="detail">
                <h2>{selected.title}</h2>
                <p>{selected.summary}</p>

                <Meta label="Mitjà" value={selected.mediaName} />
                <Meta label="Tipus" value={selected.mediaType} />
                <Meta label="Data" value={selected.publishedAt} />
                <Meta label="Autor/a" value={selected.author ?? "—"} />
                <Meta label="Secció" value={selected.section ?? "—"} />
                <Meta label="Pàgina PDF" value={`${selected.pdfPageStart}${selected.pdfPageEnd ? `–${selected.pdfPageEnd}` : ""}`} />
                <Meta label="OTS" value={money(selected.ots)} />
                <Meta label="Difusió" value={money(selected.diffusion)} />
                <Meta label="AVE" value={euros(selected.ave)} />
                <Meta label="Audiència diària" value={money(selected.audienceDaily)} />
                <Meta label="Audiència mensual" value={money(selected.audienceMonthly)} />
                <Meta label="AMD" value={money(selected.amd)} />
                <Meta label="TMU" value={selected.tmu ?? "—"} />
                <Meta label="Valor mensual" value={euros(selected.economicMonthly)} />
                <Meta label="Domini" value={selected.sourceDomain ?? "—"} />
                <Meta
                  label="URL"
                  value={
                    selected.url ? (
                      <a href={selected.url} target="_blank" rel="noreferrer">
                        Obrir notícia ↗
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />

                <button className="danger" onClick={clearDemo}>Netejar demo</button>
              </div>
            ) : (
              <div className="empty">Cap fitxa seleccionada.</div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}


function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="infoRow">
      <b>{label}</b>
      <span>{value}</span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="meta">
      <b>{label}</b>
      <span>{value}</span>
    </div>
  );
}

function Filter({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(event) => setValue(event.target.value)}>
        <option value="">Tots</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function AnalysisBlock({
  title,
  impacts,
  groupBy,
}: {
  title: string;
  impacts: Impact[];
  groupBy: keyof Impact;
}) {
  const grouped = impacts.reduce<Record<string, Impact[]>>((acc, impact) => {
    const key = String(impact[groupBy] ?? "—");
    acc[key] ??= [];
    acc[key].push(impact);
    return acc;
  }, {});

  const rows = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="analysisBlock">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted">Sense dades</p>
      ) : (
        rows.map(([name, items]) => {
          const value = items.reduce((sum, item) => sum + (item.ave ?? 0) + (item.economicMonthly ?? 0), 0);
          return (
            <div className="reportRow" key={name}>
              <b>{name}</b>
              <span>{items.length} impactes · {euros(value)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

function getImpactValue(impact: Impact) {
  return (impact.ave ?? 0) + (impact.economicMonthly ?? 0);
}

function getImpactReach(impact: Impact) {
  return (impact.ots ?? 0) + (impact.amd ?? 0) + (impact.audienceMonthly ?? 0) + (impact.diffusion ?? 0);
}

function MetricLine({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="metricLine">
      <div>
        <b>{label}</b>
        <span>{value}{suffix}</span>
      </div>
      <div className="metricBar">
        <i style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function ReportRanking({
  title,
  impacts,
  mode,
}: {
  title: string;
  impacts: Impact[];
  mode: "value" | "reach";
}) {
  const ranked = [...impacts]
    .sort((a, b) => {
      const av = mode === "value" ? getImpactValue(a) : getImpactReach(a);
      const bv = mode === "value" ? getImpactValue(b) : getImpactReach(b);
      return bv - av;
    })
    .slice(0, 6);

  return (
    <div className="rankingBlock">
      <h3>{title}</h3>
      {ranked.length === 0 ? (
        <p className="muted">Sense dades</p>
      ) : (
        ranked.map((impact, index) => {
          const value = mode === "value" ? getImpactValue(impact) : getImpactReach(impact);
          const max = Math.max(...ranked.map((item) => mode === "value" ? getImpactValue(item) : getImpactReach(item)), 1);

          return (
            <div className="rankingRow" key={impact.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <b>{impact.mediaName}</b>
                <p>{impact.title}</p>
                <div className="bar"><i style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div>
              </div>
              <strong>{mode === "value" ? euros(value) : money(value)}</strong>
            </div>
          );
        })
      )}
    </div>
  );
}

function ReportStatusBlock({ impacts }: { impacts: Impact[] }) {
  const statuses = ["pendent", "revisat", "validat", "arxivat"];

  return (
    <div className="rankingBlock">
      <h3>Estat de revisió</h3>
      {statuses.map((status) => {
        const count = impacts.filter((impact) => impact.status === status).length;
        const percent = impacts.length ? Math.round((count / impacts.length) * 100) : 0;

        return (
          <div className="statusReportRow" key={status}>
            <b>{status}</b>
            <div className="bar"><i style={{ width: `${percent}%` }} /></div>
            <span>{count} · {percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ReportTypeBlock({ impacts }: { impacts: Impact[] }) {
  const types = ["PREMSA", "ONLINE", "PENDENT"];

  return (
    <div className="rankingBlock">
      <h3>Distribució per tipus</h3>
      {types.map((type) => {
        const count = impacts.filter((impact) => impact.mediaType === type).length;
        const percent = impacts.length ? Math.round((count / impacts.length) * 100) : 0;

        return (
          <div className="statusReportRow" key={type}>
            <b>{type}</b>
            <div className="bar"><i style={{ width: `${percent}%` }} /></div>
            <span>{count} · {percent}%</span>
          </div>
        );
      })}
    </div>
  );
}
