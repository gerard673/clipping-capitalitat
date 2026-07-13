"use client";

import { useMemo, useState } from "react";

type Status = "pendent" | "revisat" | "validat" | "arxivat";
type MediaType = "PREMSA" | "ONLINE";
type View = "reculls" | "revisio" | "cataleg" | "informe";

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

  const reviewQueue = useMemo(() => {
    return impacts.filter((impact) => impact.status !== "validat" && impact.status !== "arxivat");
  }, [impacts]);

  const selected =
    impacts.find((impact) => impact.id === selectedId) ??
    filtered[0] ??
    impacts[0];

  const reviewSelected =
    reviewQueue.find((impact) => impact.id === selectedId) ??
    reviewQueue[0];

  const totalAve = reportImpacts.reduce((sum, impact) => sum + (impact.ave ?? 0), 0);
  const totalEconomicMonthly = reportImpacts.reduce((sum, impact) => sum + (impact.economicMonthly ?? 0), 0);
  const totalAudience = reportImpacts.reduce((sum, impact) => sum + (impact.audienceMonthly ?? 0), 0);
  const totalOts = reportImpacts.reduce((sum, impact) => sum + (impact.ots ?? 0), 0);
  const totalDiffusion = reportImpacts.reduce((sum, impact) => sum + (impact.diffusion ?? 0), 0);

  function simulatePdfImport() {
    setImpacts(sampleImpacts);
    setSelectedId(sampleImpacts[0].id);
    setView("revisio");
  }

  function updateImpact(id: string, fields: Partial<Impact>) {
    setImpacts((current) =>
      current.map((impact) => (impact.id === id ? { ...impact, ...fields } : impact)),
    );
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

        <div className="content">
          <aside className="left">
            <div className="panelHead">
              <h2>Impactes detectats</h2>
              <span>{filtered.length}</span>
            </div>

            <div className="filters">
              <label>Tipus</label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">Tots</option>
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
              <section className="page">
                <div className="bigTitle">Importar recull PDF</div>

                <div className="uploadGrid">
                  <div className="uploadBox">
                    <p className="kicker">MVP demo</p>
                    <h1>Del PDF de clipping a una base de dades d’impactes.</h1>
                    <p>
                      La plataforma rep un recull de premsa en PDF, detecta les pàgines útils,
                      separa PREMSA i ONLINE, crea fitxes i extreu les captures de pàgina.
                    </p>

                    <div className="fakeUpload">
                      <span>Recull de premsa del 19 al 31 de gener.pdf</span>
                      <button onClick={simulatePdfImport}>Simular importació</button>
                    </div>

                    <p className="smallNote">
                      En la versió real: el PDF es guardarà a Supabase Storage, cada pàgina es renderitzarà com a imatge i cada impacte tindrà vinculada la seva captura.
                    </p>
                  </div>

                  <div className="processBox">
                    <h3>Procés previst</h3>
                    <ol>
                      <li>Pujar PDF del recull</li>
                      <li>Detectar portada i separadors</li>
                      <li>Separar PREMSA / ONLINE</li>
                      <li>Extreure metadades, titulars i URLs</li>
                      <li>Renderitzar cada pàgina com a imatge</li>
                      <li>Agrupar pàgines d’un mateix article</li>
                      <li>Crear fitxes pendents de revisar</li>
                    </ol>
                  </div>
                </div>
              </section>
            )}

            {view === "revisio" && (
              <section className="tinderReview">
                {!reviewSelected ? (
                  <div className="reviewDone">
                    <h1>Revisió completada</h1>
                    <p>No queden impactes pendents de revisar. Els impactes validats desapareixen d’aquesta pestanya i passen al catàleg i a l’informe.</p>
                    <button onClick={() => setView("cataleg")}>Anar al catàleg</button>
                  </div>
                ) : (
                  <>
                    <div className="reviewCounter">
                      <span>{reviewQueue.length} impactes a la cua de revisió</span>
                      <b>{reviewSelected.mediaType}</b>
                    </div>

                    <div className="reviewCard">
                      <div className="pdfPageImage">
                        <div className="sheetHeader">
                          <b>{reviewSelected.mediaName}</b>
                          <span>P.{reviewSelected.pdfPageStart}</span>
                        </div>
                        <div className="extractedImage">
                          <span>CAPTURA EXTRETA DEL PDF</span>
                        </div>
                        <h1>{reviewSelected.title}</h1>
                        <p>{reviewSelected.summary}</p>
                      </div>

                      <div className="reviewFields">
                        <label>Campanya</label>
                        <input value={reviewSelected.campaign} onChange={(e) => updateImpact(reviewSelected.id, { campaign: e.target.value })} />

                        <label>Tema</label>
                        <input value={reviewSelected.topic} onChange={(e) => updateImpact(reviewSelected.id, { topic: e.target.value })} />

                        <label>Territori</label>
                        <input value={reviewSelected.territory} onChange={(e) => updateImpact(reviewSelected.id, { territory: e.target.value })} />

                        <label>Idioma</label>
                        <input value={reviewSelected.language} onChange={(e) => updateImpact(reviewSelected.id, { language: e.target.value })} />

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
                        <textarea value={reviewSelected.notes} onChange={(e) => updateImpact(reviewSelected.id, { notes: e.target.value })} />
                      </div>
                    </div>

                    <div className="tinderActions">
                      <button onClick={archiveReview}>Arxivar</button>
                      <button onClick={skipReview}>Saltar</button>
                      <button onClick={() => updateImpact(reviewSelected.id, { status: "revisat" })}>Revisat</button>
                      <button className="validate" onClick={validateReview}>Validar</button>
                    </div>
                  </>
                )}
              </section>
            )}

            {view === "cataleg" && (
              <section className="catalog">
                {filtered.length === 0 ? (
                  <div className="empty">No hi ha impactes per mostrar.</div>
                ) : (
                  filtered.map((impact) => (
                    <button
                      key={impact.id}
                      className={selected?.id === impact.id ? "strip selected" : "strip"}
                      onClick={() => setSelectedId(impact.id)}
                    >
                      <div className="stripNo">P.{impact.pdfPageStart}</div>
                      <div className="stripBody">
                        <h3>{impact.title}</h3>
                        <p>{impact.mediaName}</p>
                      </div>
                      <div className="stripFoot">
                        <span>{impact.mediaType}</span>
                        <span>{impact.campaign}</span>
                      </div>
                    </button>
                  ))
                )}
              </section>
            )}

            {view === "informe" && (
              <section className="report">
                <div className="reportHeader">
                  <div>
                    <p className="kicker">Informe filtrable</p>
                    <h1>Informe del recull</h1>
                  </div>
                  <button>Exportar informe</button>
                </div>

                <div className="reportFilters">
                  <Filter label="Tipus" value={reportType} setValue={setReportType} options={["PREMSA", "ONLINE"]} />
                  <Filter label="Estat" value={reportStatus} setValue={setReportStatus} options={["pendent", "revisat", "validat", "arxivat"]} />
                  <Filter label="Campanya" value={reportCampaign} setValue={setReportCampaign} options={campaigns} />
                  <Filter label="Territori" value={reportTerritory} setValue={setReportTerritory} options={territories} />
                  <Filter label="Idioma" value={reportLanguage} setValue={setReportLanguage} options={languages} />
                  <Filter label="Importància" value={reportImportance} setValue={setReportImportance} options={["baixa", "mitjana", "alta"]} />
                  <Filter label="Mitjà" value={reportMedia} setValue={setReportMedia} options={mediaNames} />
                </div>

                <div className="kpis wide">
                  <Kpi value={reportImpacts.length} label="Impactes filtrats" />
                  <Kpi value={reportImpacts.filter(i => i.mediaType === "PREMSA").length} label="Premsa" />
                  <Kpi value={reportImpacts.filter(i => i.mediaType === "ONLINE").length} label="Online" />
                  <Kpi value={reportImpacts.filter(i => i.status === "validat").length} label="Validats" />
                  <Kpi value={euros(totalAve)} label="AVE premsa" />
                  <Kpi value={euros(totalEconomicMonthly)} label="Valor online mensual" />
                  <Kpi value={money(totalAudience)} label="Audiència mensual" />
                  <Kpi value={money(totalOts + totalDiffusion)} label="OTS + difusió" />
                </div>

                <div className="analysisGrid">
                  <AnalysisBlock title="Per campanya" impacts={reportImpacts} groupBy="campaign" />
                  <AnalysisBlock title="Per mitjà" impacts={reportImpacts} groupBy="mediaName" />
                  <AnalysisBlock title="Per territori" impacts={reportImpacts} groupBy="territory" />
                  <AnalysisBlock title="Per idioma" impacts={reportImpacts} groupBy="language" />
                </div>

                <div className="reportTable">
                  <h3>Taula d’impactes</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Pàg.</th>
                        <th>Mitjà</th>
                        <th>Títol</th>
                        <th>Tipus</th>
                        <th>Campanya</th>
                        <th>Valor</th>
                        <th>Estat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportImpacts.map((impact) => (
                        <tr key={impact.id}>
                          <td>P.{impact.pdfPageStart}</td>
                          <td>{impact.mediaName}</td>
                          <td>{impact.title}</td>
                          <td>{impact.mediaType}</td>
                          <td>{impact.campaign}</td>
                          <td>{impact.mediaType === "PREMSA" ? euros(impact.ave) : euros(impact.economicMonthly)}</td>
                          <td><span className={`badge ${impact.status}`}>{impact.status}</span></td>
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
                <Meta label="Valor mensual" value={euros(selected.economicMonthly)} />
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
