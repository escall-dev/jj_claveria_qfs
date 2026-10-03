import type { Quotation } from "@/types/quotation";

/**
 * Document Generation Layer Boundary for JJ Claveria QFS.
 *
 * Architectural Isolation:
 * Quotation Data (Form / Database) -> Document Generation Layer -> DOCX / PDF outputs
 *
 * This layer is decoupled from the quotation UI and React rendering context.
 */

export type SupportedDocumentFormat = "docx" | "pdf";

export interface DocumentGenerationOptions {
  format: SupportedDocumentFormat;
  includeHeaderLogo?: boolean;
  watermark?: string;
}

export interface DocumentGenerator {
  generate(
    quotation: Quotation,
    options: DocumentGenerationOptions
  ): Promise<Uint8Array | Blob>;
}
