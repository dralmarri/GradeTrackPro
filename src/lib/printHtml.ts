import { isNativeApp } from "@/lib/platform";

// Prints a self-contained HTML string.
//
// On the web (and desktop Safari/Chrome) we can just load the HTML into a
// hidden same-page <iframe> and call print() on its contentWindow — no new
// window needed, works everywhere a real browser is involved.
//
// Inside the native iOS/Android app shell that trick silently does nothing:
// the app's embedded WKWebView has no print support at all (unlike real
// Safari), so window.print() is a no-op with no error and no dialog. The
// only reliable way to print from inside a Capacitor app is to hand the
// content to a *real* system browser view, which does support printing (via
// its Share sheet) — so on native we write the HTML to a temp file and open
// it with @capacitor/browser's in-app Safari view instead.
async function printNative(html: string): Promise<boolean> {
  const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
  const { Browser } = await import("@capacitor/browser");
  const fileName = `print-${Date.now()}.html`;
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: html,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Browser.open({ url: uri });
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
