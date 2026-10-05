import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile, execFileSync } from "node:child_process";
import { ValidationError, DocumentGenerationError } from "../errors.ts";
import { generateQuotationDocx } from "./exporter.ts";
import type { QuotationWithItems } from "../../types/quotation.ts";
import type { QuotationExportResult } from "./exporter.ts";

if (typeof window !== "undefined") {
  throw new Error(
    "PDF document service is a server-only module and cannot be imported in the browser."
  );
}

/**
 * Standard default candidate paths for LibreOffice across common platforms.
 */
const DEFAULT_LIBREOFFICE_PATHS: string[] = [
  // Windows (prefer console wrapper .com for cleaner CLI execution, fallback to .exe)
  "C:\\Program Files\\LibreOffice\\program\\soffice.com",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  // Linux
  "/usr/bin/libreoffice",
  "/usr/bin/soffice",
  "/usr/local/bin/libreoffice",
  "/usr/local/bin/soffice",
  // macOS
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
];

let cachedLibreOfficeExecutable: string | null = null;

/**
 * Resolves the path to the LibreOffice executable.
 *
 * Search order:
 * 1. LIBREOFFICE_PATH environment variable
 * 2. SOFFICE_PATH environment variable
 * 3. Default known installation paths for the platform
 * 4. System PATH resolution using where.exe / which
 */
export function resolveLibreOfficePath(forceRefresh = false): string {
  if (!forceRefresh && cachedLibreOfficeExecutable && fs.existsSync(/*turbopackIgnore: true*/ cachedLibreOfficeExecutable)) {
    return cachedLibreOfficeExecutable;
  }

  // 1. Check explicit environment variables
  const envPaths = [process.env.LIBREOFFICE_PATH, process.env.SOFFICE_PATH];
  for (const envPath of envPaths) {
    if (envPath && fs.existsSync(/*turbopackIgnore: true*/ envPath)) {
      cachedLibreOfficeExecutable = envPath;
      return envPath;
    }
  }

  // 2. Check known filesystem locations
  for (const candidate of DEFAULT_LIBREOFFICE_PATHS) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
      cachedLibreOfficeExecutable = candidate;
      return candidate;
    }
  }

  // 3. Fallback to searching PATH via system utilities
  try {
    if (process.platform === "win32") {
      const binaries = ["soffice.com", "soffice.exe", "libreoffice.exe"];
      for (const bin of binaries) {
        try {
          const out = execFileSync(/*turbopackIgnore: true*/ "where.exe", [bin], {
            encoding: "utf8",
            windowsHide: true,
            stdio: ["ignore", "pipe", "ignore"],
          }).trim();
          const first = out.split(/\r?\n/)[0]?.trim();
          if (first && fs.existsSync(/*turbopackIgnore: true*/ first)) {
            cachedLibreOfficeExecutable = first;
            return first;
          }
        } catch {
          // Continue to next binary
        }
      }
    } else {
      const binaries = ["libreoffice", "soffice"];
      for (const bin of binaries) {
        try {
          const out = execFileSync(/*turbopackIgnore: true*/ "which", [bin], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          }).trim();
          if (out && fs.existsSync(/*turbopackIgnore: true*/ out)) {
            cachedLibreOfficeExecutable = out;
            return out;
          }
        } catch {
          // Continue to next binary
        }
      }
    }
  } catch {
    // PATH lookup failed
  }

  throw new DocumentGenerationError(
    "LibreOffice executable not found. Ensure LibreOffice is installed or configure the LIBREOFFICE_PATH environment variable.",
    "pdf"
  );
}

/**
 * Converts a DOCX binary buffer into a valid PDF buffer using the headless office engine.
 *
 * Architecture:
 * 1. Allocates an isolated, unique temporary directory under os.tmpdir().
 * 2. Writes the generated DOCX buffer to an input file.
 * 3. Invokes LibreOffice in headless mode targeting the isolated temp directory.
 * 4. Reads and validates the resulting PDF binary (checking %PDF- header).
 * 5. Strictly guarantees complete temporary directory cleanup in a try/finally block.
 */
export async function convertDocxToPdf(
  docxBuffer: Buffer | Uint8Array,
  options?: { timeoutMs?: number }
): Promise<Buffer> {
  if (!docxBuffer || docxBuffer.byteLength === 0) {
    throw new ValidationError("DOCX buffer is required for PDF conversion");
  }

  const sofficeBinary = resolveLibreOfficePath();
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "jjqfs-pdf-"));
  const inputDocxPath = path.join(tempDir, "document.docx");
  const outputPdfPath = path.join(tempDir, "document.pdf");

  try {
    await fs.promises.writeFile(/*turbopackIgnore: true*/ inputDocxPath, Buffer.from(docxBuffer));

    await new Promise<void>((resolve, reject) => {
      const args = [
        "--headless",
        "--convert-to",
        "pdf",
        inputDocxPath,
        "--outdir",
        tempDir,
      ];

      execFile(
        /*turbopackIgnore: true*/ sofficeBinary,
        args,
        {
          timeout: options?.timeoutMs ?? 30000,
          windowsHide: true,
        },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new DocumentGenerationError(
                `LibreOffice PDF conversion failed: ${error.message}${stderr ? ` (stderr: ${stderr.trim()})` : ""}`,
                "pdf"
              )
            );
            return;
          }
          resolve();
        }
      );
    });

    if (!fs.existsSync(/*turbopackIgnore: true*/ outputPdfPath)) {
      throw new DocumentGenerationError(
        "PDF conversion completed but output PDF file was not created",
        "pdf"
      );
    }

    const pdfBuffer = await fs.promises.readFile(/*turbopackIgnore: true*/ outputPdfPath);

    if (pdfBuffer.length === 0) {
      throw new DocumentGenerationError(
        "PDF conversion produced an empty file",
        "pdf"
      );
    }

    // Verify PDF magic bytes: %PDF-
    const magic = pdfBuffer.subarray(0, 5).toString("ascii");
    if (magic !== "%PDF-") {
      throw new DocumentGenerationError(
        `PDF conversion produced invalid binary (header was '${magic}', expected '%PDF-')`,
        "pdf"
      );
    }

    return pdfBuffer;
  } finally {
    // Safe temporary cleanup guarantee
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch((err: unknown) => {
      console.warn("Failed to remove temporary PDF directory:", tempDir, err);
    });
  }
}

/**
 * Sanitizes a quotation number into a safe, path-traversal-free filename with .pdf extension.
 * Allows only alphanumeric characters, underscores, and hyphens.
 * Example: "QF-2026-0001" -> "QF-2026-0001.pdf"
 */
export function getQuotationPdfFilename(qfNumber?: string | null): string {
  if (!qfNumber || typeof qfNumber !== "string") {
    return "quotation.pdf";
  }

  // Remove path separators and traversal tokens
  let clean = qfNumber.replace(/[/\\?%*:|"<>.]/g, "-");
  // Only permit alphanumeric, hyphens, and underscores
  clean = clean.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  if (!clean) {
    clean = "quotation";
  }

  return `${clean}.pdf`;
}

/**
 * Generates an official, completed PDF quotation from an authoritative saved quotation snapshot.
 *
 * Pipeline:
 * Saved Quotation Snapshot
 *       ↓
 * Existing Phase 14 DOCX generator (authoritative source of truth)
 *       ↓
 * Valid DOCX Buffer
 *       ↓
 * Headless PDF conversion service
 *       ↓
 * Valid PDF Buffer
 */
export async function generateQuotationPdf(
  quotation: QuotationWithItems,
  options?: { verifyIntegrity?: boolean; timeoutMs?: number }
): Promise<Buffer> {
  const docxBuffer = await generateQuotationDocx(quotation, {
    verifyIntegrity: options?.verifyIntegrity,
  });

  return await convertDocxToPdf(docxBuffer, {
    timeoutMs: options?.timeoutMs,
  });
}

/**
 * Authoritative pipeline for handling quotation PDF export requests:
 * 1. Checks session authentication (401 if unauthenticated).
 * 2. Validates quotation ID parameter (400 if invalid).
 * 3. Validates quotation presence (404 if not found).
 * 4. Validates line items exist (400 if empty).
 * 5. Generates official PDF via Phase 14 DOCX source of truth and returns binary response with safe attachment headers.
 */
export async function processQuotationPdfExport(
  session: unknown | null,
  quotation: QuotationWithItems | null,
  quotationId?: string | null
): Promise<QuotationExportResult> {
  // 1. Session authentication guard
  if (!session) {
    return {
      status: 401,
      headers: { "Content-Type": "text/plain" },
      body: "Unauthorized",
    };
  }

  // 2. Quotation ID parameter validation
  if (!quotationId || typeof quotationId !== "string" || quotationId.trim() === "") {
    return {
      status: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Invalid quotation ID",
    };
  }

  // 3. Quotation existence
  if (!quotation) {
    return {
      status: 404,
      headers: { "Content-Type": "text/plain" },
      body: "Quotation not found",
    };
  }

  // 4. Line items presence
  if (!quotation.items || !Array.isArray(quotation.items) || quotation.items.length === 0) {
    return {
      status: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Quotation contains no line items to export",
    };
  }

  // 5. Generate completed PDF
  const buffer = await generateQuotationPdf(quotation);
  const filename = getQuotationPdfFilename(quotation.qf_number);

  return {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename
      )}`,
      "Content-Length": buffer.byteLength.toString(),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
    body: new Uint8Array(buffer),
  };
}
