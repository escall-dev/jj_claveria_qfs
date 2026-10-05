import type { Quotation } from "../../types/quotation.ts";

/**
 * Document Generation Layer Boundary for JJ Claveria QFS (Phase 12).
 *
 * Architectural Isolation:
 * Quotation Data (Form / Database) -> Document Generation Layer -> DOCX / PDF outputs
 *
 * This layer is decoupled from the quotation UI and React rendering context.
 * It provides safe, server-only document template loading, structural mapping,
 * and immutable WordprocessingML DOM manipulation.
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

// Re-export template loading and integrity mechanisms
export {
  CANONICAL_TEMPLATE_RELATIVE_PATH,
  CANONICAL_TEMPLATE_SHA256,
  CANONICAL_TEMPLATE_BYTE_SIZE,
  getCanonicalTemplatePath,
  computeSha256,
  computeFileSha256,
  verifyTemplateIntegrity,
  loadTemplateBuffer,
  assertNotCanonicalTemplate,
  getTemplateMetadata,
} from "./template.ts";

// Re-export working document abstraction
export { WorkingDocument } from "./docx.ts";

// Re-export document errors
export {
  DocumentStructureError,
  DocumentItemCountError,
} from "../errors.ts";

// Re-export structural targets and helpers
export {
  ITEM_TABLE_COLUMN_WIDTHS_DXA,
  getChildElements,
  getCellText,
  extractDocumentTargets,
  extractTable1Targets,
  extractTable2Targets,
  extractTable3Targets,
  extractTable4Targets,
  setDateAndQfNumber,
  setCustomerField,
  setGrandTotal,
  populateItemRow,
  createCleanItemRowClone,
  validateItemCount,
  validateQuotationDocumentStructure,
  prepareItemRows,
  generateItemRows,
} from "./targets.ts";

// Re-export DOCX export functions
export {
  generateQuotationDocx,
  getQuotationDocxFilename,
  processQuotationExport,
} from "./exporter.ts";
export type { QuotationExportResult } from "./exporter.ts";

// Re-export PDF conversion and export functions
export {
  resolveLibreOfficePath,
  convertDocxToPdf,
  generateQuotationPdf,
  getQuotationPdfFilename,
  processQuotationPdfExport,
} from "./pdf.ts";

// Re-export document types
export type {
  TemplateMetadata,
  Table1HeaderTarget,
  Table2CustomerTargets,
  Table3ItemRowTarget,
  Table3QuotationItemTargets,
  Table4GrandTotalTarget,
  ItemRowPrototype,
  DocumentTargetMap,
  QuotationDocumentInput,
  QuotationDocumentItemInput,
} from "./types.ts";

