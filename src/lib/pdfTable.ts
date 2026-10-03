// Generic PDF table-row extractor built on pdf.js's raw positioned text
// items. Arabic PDF table exports (like PAAET's) don't come out of
// getTextContent() in reading order — items are grouped in column
// clusters by the PDF's internal stream order, not row by row — so we
// rebuild rows ourselves by clustering text items that share a Y
// position, then sort each row's items right-to-left (RTL reading order)
// by X position.
import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

export type PdfRow = PdfTextItem[];

// yTolerance: text items within this many PDF units of each other's
// baseline are treated as the same table row (handles slightly uneven
// baselines within one visual row).
export async function extractPdfRows(file: File, yTolerance = 3): Promise<PdfRow[]> {
  const pdfjs = await import("pdfjs-dist");
  const buf = new Uint8Array(await file.arrayBuffer());
  // runs on the main thread instead of spinning up a worker — these
  // reports are a page or two, and skipping the worker avoids having to
  // ship/resolve its separate script correctly inside the Capacitor
  // native app shell as well as the web build
  const doc = await pdfjs.getDocument({ data: buf, disableWorker: true } as Parameters<typeof pdfjs.getDocument>[0]).promise;

  const items: PdfTextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const raw of content.items as TextItem[]) {
      // college-system PDFs embed Arabic in presentation-form glyphs
      // (isolated/medial forms) rather than plain letters — normalize back
      // to standard Unicode or every later Arabic-text check silently fails
      const str = raw.str?.trim().normalize("NFKC");
      if (!str) continue;
      // transform = [scaleX, skewX, skewY, scaleY, x, y] — y grows upward,
      // offset by page index ×10000 so rows never merge across pages
      items.push({ str, x: raw.transform[4], y: raw.transform[5] + p * 10000 });
    }
  }

  items.sort((a, b) => b.y - a.y || b.x - a.x);

  const rows: PdfRow[] = [];
  for (const item of items) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - item.y) <= yTolerance) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }
  return rows;
}
