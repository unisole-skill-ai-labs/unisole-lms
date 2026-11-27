import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  AlertCircle,
} from "lucide-react";

interface PdfViewerProps {
  blobUrl: string | null;
  fileName?: string;
  onDownload?: () => void;
  isLoadingExternal?: boolean;
  externalError?: string | null;
}

interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  containerWidth: number;
}

function PdfPageCanvas({ pdfDoc, pageNumber, scale, containerWidth }: PdfPageCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);
  const [renderedKey, setRenderedKey] = useState<string>("");

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsVisible(true);
        }
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    const renderKey = `${pageNumber}:${scale}:${Math.round(containerWidth)}`;
    if (renderedKey === renderKey) return;

    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const targetBaseWidth = Math.max(260, (containerWidth || 720) - 32);
        const responsiveScale = (targetBaseWidth / baseViewport.width) * scale;
        const viewport = page.getViewport({ scale: responsiveScale });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!cancelled) setRenderedKey(renderKey);
      } catch {
        // Ignore cancelled/disposed render tasks
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isVisible, pdfDoc, pageNumber, scale, containerWidth, renderedKey]);

  return (
    <div
      ref={hostRef}
      data-pdf-page={pageNumber}
      className="flex justify-center py-2"
    >
      <canvas
        ref={canvasRef}
        className="bg-white shadow-md rounded border border-slate-200 dark:border-slate-700 max-w-full"
      />
    </div>
  );
}

export default function PdfViewer({
  blobUrl,
  fileName = "document.pdf",
  onDownload,
  isLoadingExternal = false,
  externalError = null,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(720);

  const canFullscreen =
    typeof document !== "undefined" &&
    Boolean(
      document.fullscreenEnabled ||
        (document.documentElement as any)?.requestFullscreen
    );

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const updateWidth = () => {
      if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!blobUrl) {
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      return;
    }
    let cancelled = false;
    let activeTask: any = null;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    (async () => {
      try {
        const pdfjsLib: any = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        activeTask = pdfjsLib.getDocument({ url: blobUrl });
        const doc = await activeTask.promise;
        if (cancelled) {
          doc.destroy?.();
          return;
        }
        setPdfDoc(doc);
        setNumPages(doc.numPages || 1);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to render PDF document.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        activeTask?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [blobUrl]);

  const scrollToPage = useCallback(
    (pageNum: number) => {
      const clamped = Math.max(1, Math.min(numPages || 1, pageNum));
      setCurrentPage(clamped);
      const target = scrollAreaRef.current?.querySelector(
        `[data-pdf-page="${clamped}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [numPages]
  );

  const handleScroll = useCallback(() => {
    const scroller = scrollAreaRef.current;
    if (!scroller || numPages <= 1) return;
    const pageEls = scroller.querySelectorAll<HTMLElement>("[data-pdf-page]");
    const topThreshold = scroller.getBoundingClientRect().top + 120;
    let visiblePage = 1;
    pageEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= topThreshold) {
        visiblePage = Number(el.dataset.pdfPage || 1);
      }
    });
    setCurrentPage(visiblePage);
  }, [numPages]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el || !canFullscreen) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Graceful fallback if browser blocks fullscreen
    }
  };

  const triggerDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.click();
  };

  const effectiveError = externalError || error;
  const effectiveLoading = isLoadingExternal || loading;

  return (
    <div
      ref={containerRef}
      data-testid="pdf-viewer"
      className={`w-full flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#070A11] overflow-hidden ${
        isFullscreen ? "h-screen w-screen rounded-none" : "min-h-[75vh] h-[75vh]"
      }`}
    >
      {/* Minimal Controls Bar: Prev/Next + Page Indicator, Zoom Out/In, Download, Fullscreen */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 shrink-0 z-10">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="pdf-prev-page"
            aria-label="Previous page"
            disabled={!pdfDoc || currentPage <= 1}
            onClick={() => scrollToPage(currentPage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            data-testid="pdf-page-indicator"
            className="text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 tabular-nums"
          >
            {numPages > 0 ? `${currentPage} / ${numPages}` : "0 / 0"}
          </span>
          <button
            type="button"
            data-testid="pdf-next-page"
            aria-label="Next page"
            disabled={!pdfDoc || currentPage >= numPages}
            onClick={() => scrollToPage(currentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="pdf-zoom-out"
            aria-label="Zoom out"
            disabled={!pdfDoc || scale <= 0.6}
            onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(2))))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 px-1">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            data-testid="pdf-zoom-in"
            aria-label="Zoom in"
            disabled={!pdfDoc || scale >= 2.4}
            onClick={() => setScale((s) => Math.min(2.4, Number((s + 0.2).toFixed(2))))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-testid="pdf-download"
            onClick={triggerDownload}
            disabled={!blobUrl && !onDownload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {canFullscreen && (
            <button
              type="button"
              data-testid="pdf-fullscreen"
              aria-label={isFullscreen ? "Minimize" : "Fullscreen"}
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Minimize</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Continuous Vertical Scroll PDF Content */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {effectiveLoading && (
          <div className="h-full flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            <span>Loading PDF...</span>
          </div>
        )}

        {!effectiveLoading && effectiveError && (
          <div
            data-testid="pdf-error-fallback"
            className="h-full flex flex-col items-center justify-center gap-3 text-center p-6"
          >
            <AlertCircle className="w-7 h-7 text-rose-500" />
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 max-w-md">
              {effectiveError}
            </p>
            {(blobUrl || onDownload) && (
              <button
                type="button"
                onClick={triggerDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            )}
          </div>
        )}

        {!effectiveLoading && !effectiveError && pdfDoc && (
          <div>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <PdfPageCanvas
                key={pageNum}
                pdfDoc={pdfDoc}
                pageNumber={pageNum}
                scale={scale}
                containerWidth={containerWidth}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
