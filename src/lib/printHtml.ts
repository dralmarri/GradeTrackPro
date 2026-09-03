// Prints a self-contained HTML string without opening a new browser window.
// window.open()-based printing (the previous approach) is unreliable inside
// a Capacitor WKWebView on iOS: the app has no real popup-window support, so
// the OS surfaces a "block pop-ups" permission bar that a WKWebView button
// tap can't reliably satisfy, leaving printing stuck. A hidden same-page
// <iframe> avoids opening any new window at all — we just load the HTML
// into it and call print() on its contentWindow — so it works the same way
// in the web app, in Safari, and inside the native iOS/Android shell.
export function printHtml(html: string): boolean {
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
