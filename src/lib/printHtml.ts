import { isNativeApp } from "@/lib/platform";

// Prints a self-contained HTML string.
//
// On the web (and desktop Safari/Chrome) we can just load the HTML into a
// hidden same-page <iframe> and call print() on its contentWindow — no new
// window needed, works everywhere a real browser is involved.
//
// Inside the native iOS/Android app shell, window.print() is a silent no-op:
// the app's embedded WKWebView has no print support at all (confirmed via
// Safari Web Inspector — zero console errors, nothing ever opens). Opening
// the HTML in a real Safari view doesn't work either — SFSafariViewController
// refuses local file:// URLs outright ("Unable to display URL"). The only
// reliable native path is a dedicated printing plugin that drives the OS
// print UI directly (UIPrintInteractionController on iOS, PrintManager on
// Android), so we use @capgo/capacitor-printer there instead.
async function printNative(html: string): Promise<boolean> {
  const { Printer } = await import("@capgo/capacitor-printer");
  await Printer.printHtml({ name: "GradeTrackPro", html });
  return true;
}

function printWeb(html: string): boolean {
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
    return false;
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
  return true;
}

export function printHtml(html: string): boolean {
  if (isNativeApp()) {
    printNative(html).catch(() => printWeb(html));
    return true;
  }
  return printWeb(html);
}
