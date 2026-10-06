"use client";

import { useState, useEffect, useRef } from "react";

interface DocumentPreviewProps {
  quotationId: string;
  qfNumber: string;
  itemCount: number;
  totalAmount?: number;
}

export function DocumentPreview({
  quotationId,
  qfNumber,
  itemCount,
}: DocumentPreviewProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isViewerVisible, setIsViewerVisible] = useState<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGeneratePreview = async () => {
    // Prevent duplicate concurrent requests
    if (status === "loading") {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setErrorMessage(null);
    setIsViewerVisible(true);

    try {
      const response = await fetch(`/quotations/${quotationId}/preview`, {
        signal: controller.signal,
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        let errDetail = "Failed to generate quotation preview document";
        try {
          const text = await response.text();
          if (text) {
            errDetail = text;
          }
        } catch {
          // ignore parsing error
        }

        if (response.status === 401) {
          errDetail = "Your session has expired. Please log in again to preview this quotation.";
        } else if (response.status === 404) {
          errDetail = "Quotation not found. It may have been removed.";
        }

        throw new Error(errDetail);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Received an empty document from the export service.");
      }

      // Revoke prior blob URL to prevent memory leaks
      if (pdfBlobUrl && pdfBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfBlobUrl);
      }

      const newUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newUrl);
      setStatus("ready");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      console.error("Quotation PDF preview generation error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while generating the preview. Please try again.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  // Clean up object URLs on unmount or before generating a new one
  useEffect(() => {
    return () => {
      if (pdfBlobUrl && pdfBlobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pdfBlobUrl]);


  const handleCloseViewer = () => {
    setIsViewerVisible(false);
  };

  const handleShowViewer = () => {
    setIsViewerVisible(true);
  };

  return (
    <section
      id="document-preview-section"
      aria-label="Document Preview Section"
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-4"
    >
      {/* Section Header & Main Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-zinc-700 dark:text-zinc-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Document Preview & Export</span>
            </h2>
            {status === "idle" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Official Pipeline
              </span>
            )}
            {status === "loading" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Generating PDF...
              </span>
            )}
            {status === "ready" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                PDF Ready
              </span>
            )}
            {status === "error" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                Generation Failed
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Preview the authoritative generated document formatted with official headers, line items, and authorized sign-off.
          </p>
        </div>

        {/* Action Controls Toolbar: [Preview] [Download DOCX] [Download PDF] */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preview Trigger Button */}
          {status !== "ready" ? (
            <button
              type="button"
              id="preview-quotation-button"
              onClick={handleGeneratePreview}
              disabled={status === "loading"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>Preview Quotation</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              id="preview-refresh-button"
              onClick={handleGeneratePreview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
              title="Regenerate document preview"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh Preview</span>
            </button>
          )}

          {/* Download DOCX Button */}
          <a
            href={`/quotations/${quotationId}/export`}
            download={`${qfNumber}.docx`}
            id="preview-download-docx-button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download DOCX</span>
          </a>

          {/* Download PDF Button */}
          <a
            href={`/quotations/${quotationId}/export/pdf`}
            download={`${qfNumber}.pdf`}
            id="preview-download-pdf-button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-600 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/60 px-3.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-xs"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {/* Main Content Area based on State */}

      {/* 1. IDLE STATE: Document Preview Launch Card */}
      {status === "idle" && (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 sm:p-12 text-center bg-zinc-50/50 dark:bg-zinc-800/30 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Official Quotation Document Preview
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Click &quot;Preview Quotation&quot; to compile and view the official PDF document layout before downloading.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span>{itemCount} Line Items</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span>Official Template</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span>Embedded PDF Viewer</span>
            </span>
          </div>
          <div className="pt-2">
            <button
              type="button"
              id="preview-cta-button"
              onClick={handleGeneratePreview}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Load Document Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. LOADING STATE: Visible loading indicator, NO empty frame */}
      {status === "loading" && (
        <div
          id="preview-loading-indicator"
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 sm:p-16 text-center bg-zinc-50/70 dark:bg-zinc-900/60 space-y-4 min-h-[420px] flex flex-col items-center justify-center"
        >
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
            <svg
              className="absolute h-6 w-6 text-zinc-700 dark:text-zinc-300 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Generating Official PDF Preview...
            </h3>
            <p className="text-xs text-zinc-500">
              Rendering document layout with company headers, snapshot items, and official calculations.
            </p>
          </div>
          <p className="text-[11px] text-zinc-400">
            This typically takes 2–3 seconds. Download buttons above remain active.
          </p>
        </div>
      )}

      {/* 3. ERROR STATE: Concise user-facing error, downloads remain available */}
      {status === "error" && (
        <div
          id="preview-error-notice"
          className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 p-6 sm:p-8 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Document Preview Generation Failed
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {errorMessage || "Unable to render the quotation document preview at this time."}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                You can retry generating the preview or download the official DOCX / PDF documents directly using the buttons above.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-100 dark:border-rose-900/40">
            <button
              type="button"
              id="preview-retry-button"
              onClick={handleGeneratePreview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-semibold transition-colors shadow-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Retry Preview</span>
            </button>
            <a
              href={`/quotations/${quotationId}/export/pdf`}
              download={`${qfNumber}.pdf`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <span>Download PDF Directly</span>
            </a>
            <a
              href={`/quotations/${quotationId}/export`}
              download={`${qfNumber}.docx`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <span>Download DOCX Instead</span>
            </a>
          </div>
        </div>
      )}

      {/* 4. READY STATE: Functional Embedded PDF Viewer */}
      {status === "ready" && pdfBlobUrl && (
        <div className="space-y-3">
          {/* Sub-toolbar with view controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {qfNumber}.pdf
              </span>
              <span className="text-zinc-400">•</span>
              <span className="text-[11px] text-zinc-500">
                Official Generated Document
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/quotations/${quotationId}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                id="preview-open-new-tab-button"
                className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium px-2 py-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                title="Open PDF in a new tab"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span>Open in New Tab</span>
              </a>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium px-2 py-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                title={isExpanded ? "Collapse height" : "Expand height"}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isExpanded ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  )}
                </svg>
                <span>{isExpanded ? "Standard View" : "Expand"}</span>
              </button>

              {isViewerVisible ? (
                <button
                  type="button"
                  onClick={handleCloseViewer}
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                  title="Hide viewer"
                >
                  <span>Hide</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleShowViewer}
                  className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                  title="Show viewer"
                >
                  <span>Show</span>
                </button>
              )}
            </div>
          </div>

          {/* Embedded PDF Viewer Container */}
          {isViewerVisible && (
            <div
              className={`relative w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 transition-all ${
                isExpanded ? "h-[950px]" : "h-[600px] sm:h-[750px]"
              }`}
            >
              <object
                id="document-preview-object"
                data={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="w-full h-full block"
              >
                {/* Fallback iframe */}
                <iframe
                  id="document-preview-iframe"
                  src={`${pdfBlobUrl}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-0"
                  title={`Quotation Preview - ${qfNumber}`}
                >
                  {/* Fallback content for devices without native PDF viewer */}
                  <div className="p-8 text-center space-y-4 bg-zinc-50 dark:bg-zinc-900 h-full flex flex-col items-center justify-center">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Your browser does not support embedded PDF viewing.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <a
                        href={`/quotations/${quotationId}/preview`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900"
                      >
                        Open PDF in New Tab
                      </a>
                      <a
                        href={`/quotations/${quotationId}/export/pdf`}
                        download={`${qfNumber}.pdf`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3.5 py-1.5 text-xs font-medium"
                      >
                        Download PDF
                      </a>
                    </div>
                  </div>
                </iframe>
              </object>
            </div>
          )}

          {/* Mobile tip helper */}
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center sm:text-left">
            Tip: On mobile devices where embedded PDF scrolling may be limited, tap &quot;Open in New Tab&quot; above for full-screen viewing.
          </p>
        </div>
      )}
    </section>
  );
}
