import { isNativeApp } from "@/lib/platform";

const FRAME_ID = "gtp-print-frame";
const STYLE_ID = "gtp-print-style";
const PREVIEW_ID = "gtp-print-preview";

// Prints a self-contained HTML string.
//
// On the web (and desktop Safari/Chrome) we can just load the HTML into a
// hidden same-page <iframe> and call print() on its contentWindow — no new
// window needed, works everywhere a real browser is involved.
//
// Inside the native iOS/Android app shell, none of the "obvious" approaches
// work:
// - window.print() inside the app's own WKWebView is a silent no-op (no
//   print support at all there, confirmed via Web Inspector).
// - Opening a real Safari view (@capacitor/browser) can't load a local
//   file:// URL ("Unable to display URL").
// - @capgo/capacitor-printer's own printHtml() renders via the legacy
//   UIMarkupTextPrintFormatter, which doesn't support SVG or the CSS this
//   sheet relies on — it silently produces a 0-page document.
// The one thing that *does* work is that plugin's printWebView(), which
// prints the app's own live WKWebView through the real WebKit rendering
// pipeline (webView.viewPrintFormatter()) — the same engine real Safari
// printing uses. So on native we inject the sheet into the current page as
// a same-origin iframe, hide the rest of the app via @media print, print
// the webview, then clean up.
async function printNative(html: string): Promise<void> {
  const { Printer } = await import("@capgo/capacitor-printer");

  document.getElementById(FRAME_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${FRAME_ID} { position: fixed; left: -10000px; top: 0; width: 210mm; height: 297mm; border: 0; }
    @media print {
      body > *:not(#${FRAME_ID}) { display: none !important; }
      #${FRAME_ID} { position: static !important; left: auto !important; width: 100% !important; height: auto !important; }
    }
  `;
  document.head.appendChild(style);

  const iframe = document.createElement("iframe");
  iframe.id = FRAME_ID;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const cleanup = () => {
    URL.revokeObjectURL(url);
    iframe.remove();
    style.remove();
  };

  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      document.body.appendChild(iframe);
      iframe.src = url;
    });

    const fonts = (iframe.contentDocument as Document & { fonts?: { ready: Promise<unknown> } })?.fonts;
    if (fonts?.ready) await fonts.ready.catch(() => {});
    else await new Promise((r) => setTimeout(r, 400));

    // Resolves only once the print sheet is dismissed, so the iframe must
    // stay in the DOM until this await returns.
    await Printer.printWebView({ name: "GradeTrackPro" });
  } finally {
    cleanup();
  }
}

function printWeb(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    // Give the print dialog a moment to actually open before removing the
    // iframe out from under it.
    setTimeout(() => iframe.remove(), 1000);
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow!;
  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  };
  const fonts = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (fonts?.ready) fonts.ready.then(runPrint, runPrint);
  else setTimeout(runPrint, 500);
}

async function doPrint(html: string): Promise<void> {
  if (isNativeApp()) {
    try {
      await printNative(html);
    } catch {
      printWeb(html);
    }
  } else {
    printWeb(html);
  }
}

// Shows the generated sheet full-screen inside the app first, with an
// explicit "طباعة" button, instead of handing straight off to the OS print
// sheet — the native print sheet's own preview thumbnail wasn't reliably
// rendering the content before the professor had to commit to printing, so
// there was no way to actually check the form was right before paper came
// out of the printer.
function showPreview(html: string): void {
  document.getElementById(PREVIEW_ID)?.remove();

  const overlay = document.createElement("div");
  overlay.id = PREVIEW_ID;
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "9999",
    display: "flex", flexDirection: "column",
    background: "rgba(15, 23, 42, 0.92)",
  } as CSSStyleDeclaration);

  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", gap: "8px",
    background: "#0f172a",
    paddingTop: "max(12px, env(safe-area-inset-top))",
  } as CSSStyleDeclaration);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    width: "36px", height: "36px", borderRadius: "999px",
    background: "rgba(255,255,255,0.12)", color: "#fff", border: "0",
    fontSize: "16px", cursor: "pointer",
  } as CSSStyleDeclaration);
  closeBtn.onclick = () => overlay.remove();

  const printBtn = document.createElement("button");
  printBtn.textContent = "🖨️ طباعة";
  Object.assign(printBtn.style, {
    padding: "10px 20px", borderRadius: "12px",
    background: "#2563eb", color: "#fff", border: "0",
    fontSize: "14px", fontWeight: "700", cursor: "pointer",
  } as CSSStyleDeclaration);
  printBtn.onclick = async () => {
    printBtn.disabled = true;
    const original = printBtn.textContent;
    printBtn.textContent = "...";
    try {
      await doPrint(html);
    } finally {
      printBtn.disabled = false;
      printBtn.textContent = original;
    }
  };

  toolbar.appendChild(closeBtn);
  toolbar.appendChild(printBtn);

  const frameWrap = document.createElement("div");
  Object.assign(frameWrap.style, {
    flex: "1", minHeight: "0", overflow: "auto",
    display: "flex", justifyContent: "center", padding: "12px",
  } as CSSStyleDeclaration);

  const iframe = document.createElement("iframe");
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  iframe.src = url;
  iframe.onload = () => URL.revokeObjectURL(url);
  Object.assign(iframe.style, {
    width: "210mm", maxWidth: "100%", minHeight: "297mm",
    border: "0", borderRadius: "8px", background: "#fff",
  } as CSSStyleDeclaration);

  frameWrap.appendChild(iframe);
  overlay.appendChild(toolbar);
  overlay.appendChild(frameWrap);
  document.body.appendChild(overlay);
}

export function printHtml(html: string): boolean {
  showPreview(html);
  return true;
}
