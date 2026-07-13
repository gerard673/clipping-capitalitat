import { supabase } from "@/lib/supabase";

export type RenderedPdfPage = {
  pageNumber: number;
  imageUrl: string;
  text: string;
  links: string[];
};

function buildLinesFromTextItems(items: any[]) {
  const positioned = items
    .map((item: any) => {
      const transform = item.transform ?? [];
      return {
        text: String(item.str ?? "").trim(),
        x: Number(transform[4] ?? 0),
        y: Number(transform[5] ?? 0),
      };
    })
    .filter((item) => item.text.length > 0);

  const groups: { y: number; items: typeof positioned }[] = [];

  for (const item of positioned) {
    const group = groups.find((g) => Math.abs(g.y - item.y) < 4);

    if (group) {
      group.items.push(item);
    } else {
      groups.push({ y: item.y, items: [item] });
    }
  }

  return groups
    .sort((a, b) => b.y - a.y)
    .map((group) =>
      group.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

export async function renderAndUploadPdfPages(file: File, recullId: string) {
  const pdfjsLib: any = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  const pages: RenderedPdfPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const textContent = await page.getTextContent();
    const lines = buildLinesFromTextItems(textContent.items ?? []);
    const pageText = lines.join("\n").replaceAll("￾", "").trim();

    const annotations = await page.getAnnotations({ intent: "display" });
    const links = annotations
      .map((annotation: any) => annotation.url || annotation.unsafeUrl || "")
      .filter((url: string) => url && /^https?:\/\//i.test(url));

    const viewport = page.getViewport({ scale: 1.2 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No s'ha pogut crear el canvas.");
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((createdBlob) => {
        if (!createdBlob) {
          reject(new Error("No s'ha pogut crear la imatge de la pàgina."));
        } else {
          resolve(createdBlob);
        }
      }, "image/png");
    });

    const path = `reculls/${recullId}/page-${String(pageNumber).padStart(3, "0")}.png`;

    const { error: uploadError } = await supabase.storage
      .from("press-page-images")
      .upload(path, blob, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("press-page-images")
      .getPublicUrl(path);

    pages.push({
      pageNumber,
      imageUrl: data.publicUrl,
      text: pageText,
      links,
    });
  }

  return pages;
}
