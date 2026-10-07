import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_PAGES = 3;

/**
 * Renders the first pages of a PDF onto canvases. Unlike an <iframe>, this
 * works on every browser, including mobile ones without a built-in PDF viewer.
 */
export default function PdfPreview({ data, title }) {
  const container = useRef(null);
  const [state, setState] = useState({ status: "loading", pages: 0 });

  useEffect(() => {
    let cancelled = false;
    let doc = null;
    const target = container.current;
    (async () => {
      try {
        doc = await pdfjs.getDocument({ data: new Uint8Array(await data.arrayBuffer()) }).promise;
        if (cancelled) return;
        target.replaceChildren();
        const width = target.clientWidth || 600;
        const count = Math.min(doc.numPages, MAX_PAGES);
        for (let n = 1; n <= count && !cancelled; n++) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const ratio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: (width / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.className = "pdf-preview__page";
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${title}, page ${n}`);
          target.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        }
        if (!cancelled) setState({ status: "ready", pages: doc.numPages });
      } catch (err) {
        console.error("PDF preview failed:", err);
        if (!cancelled) setState({ status: "error", pages: 0 });
      }
    })();
    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [data, title]);

  return (
    <div className="pdf-preview">
      {state.status === "loading" && <p className="hint">Loading the preview…</p>}
      {state.status === "error" && <p className="hint">The preview couldn't be shown. Use "Open" to view the file.</p>}
      <div ref={container} className="pdf-preview__pages" />
      {state.status === "ready" && state.pages > MAX_PAGES && (
        <p className="hint">Showing the first {MAX_PAGES} of {state.pages} pages. Use "Open" to see them all.</p>
      )}
    </div>
  );
}
