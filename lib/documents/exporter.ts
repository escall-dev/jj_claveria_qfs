import { WorkingDocument } from "./docx.ts";
import {
  setDateAndQfNumber,
  setCustomerField,
  populateItemRow,
  setGrandTotal,
} from "./targets.ts";
import { formatCurrency } from "../calculations/index.ts";
import { ValidationError } from "../errors.ts";
import type { QuotationWithItems } from "../../types/quotation.ts";

/**
 * Sanitizes a quotation number into a safe, path-traversal-free filename.
 * Allows only alphanumeric characters, underscores, and hyphens.
 * Example: "QF-2026-0001" -> "QF-2026-0001.docx"
 */
export function getQuotationDocxFilename(qfNumber?: string | null): string {
  if (!qfNumber || typeof qfNumber !== "string") {
    return "quotation.docx";
  }

  // Remove path separators and traversal tokens
  let clean = qfNumber.replace(/[/\\?%*:|"<>.]/g, "-");
  // Only permit alphanumeric, hyphens, and underscores
  clean = clean.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  if (!clean) {
    clean = "quotation";
  }

  return `${clean}.docx`;
}

/**
 * Generates an official, completed DOCX quotation from an authoritative saved quotation snapshot.
 *
 * Architecture:
 * 1. Loads the official canonical blank template into an in-memory WorkingDocument.
 * 2. Cryptographically verifies canonical template integrity.
 * 3. Dynamically adjusts Table 3 item rows to match quotation.items.length.
 * 4. Populates Table 1: Date and QF Number.
 * 5. Populates Table 2: Customer Name, Address, Contact Person, Contact Number.
 * 6. Populates Table 3: Item Rows with historical item descriptions, brands, UOMs, prices, quantities, and totals.
 * 7. Populates Table 4: Authoritative Grand Total.
 * 8. Validates complete document structure.
 * 9. Serializes to binary DOCX Buffer.
 *
 * Preserves canonical template immutability (the file on disk is never modified).
 */
export async function generateQuotationDocx(
  quotation: QuotationWithItems,
  options?: { verifyIntegrity?: boolean }
): Promise<Buffer> {
  if (!quotation) {
    throw new ValidationError("Quotation data is required for DOCX export");
  }

  if (!quotation.items || !Array.isArray(quotation.items) || quotation.items.length === 0) {
    throw new ValidationError(
      "Quotation must contain at least 1 line item to export a valid document"
    );
  }

  // 1. Load the canonical template into an immutable working document
  const doc = await WorkingDocument.load(undefined, {
    verifyIntegrity: options?.verifyIntegrity ?? true,
  });

  // 2. Prepare dynamic item rows in Table 3 matching the snapshot item count
  const itemTargets = doc.prepareItemRows(quotation.items.length);
  const targets = doc.getTargets();

  // 3. Populate Table 1: Quotation Date and QF Number
  setDateAndQfNumber(
    targets.table1,
    quotation.quotation_date || "",
    quotation.qf_number || ""
  );

  // 4. Populate Table 2: Customer and Company Details (Historical Snapshot)
  // Null or undefined values are handled safely as empty strings without rendering "null" or "undefined"
  setCustomerField(targets.table2.nameCell, quotation.customer_name || "");
  setCustomerField(targets.table2.addressCell, quotation.customer_address || "");
  setCustomerField(targets.table2.contactPersonCell, quotation.contact_person || "");
  setCustomerField(targets.table2.contactNumberCell, quotation.contact_number || "");

  // 5. Populate Table 3: Dynamic Item Rows
  for (let i = 0; i < quotation.items.length; i++) {
    const item = quotation.items[i];
    populateItemRow(itemTargets[i], {
      itemNumber: item.item_number ?? i + 1,
      description: item.item_description || "",
      brand: item.brand_name || "",
      uom: item.uom || "",
      unitPrice: formatCurrency(item.unit_price),
      quantity: String(item.quantity),
      total: formatCurrency(item.item_total),
    });
  }

  // 6. Populate Table 4: Authoritative Grand Total (no recalculation)
  setGrandTotal(
    targets.table4.grandTotalCell,
    formatCurrency(quotation.total_amount)
  );

  // 7. Validate complete document structure before serialization
  doc.validateDocumentStructure();

  // 8. Serialize and return the completed binary DOCX buffer
  return await doc.saveToBuffer();
}

export interface QuotationExportResult {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
}

/**
 * Authoritative pipeline for handling quotation DOCX export requests:
 * 1. Checks session authentication (401 if unauthenticated).
 * 2. Validates quotation ID parameter (400 if invalid).
 * 3. Validates quotation presence (404 if not found).
 * 4. Validates line items exist (400 if empty).
 * 5. Generates official DOCX and returns binary response with safe attachment headers.
 */
export async function processQuotationExport(
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

  // 5. Generate completed DOCX
  const buffer = await generateQuotationDocx(quotation);
  const filename = getQuotationDocxFilename(quotation.qf_number);

  return {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename
      )}`,
      "Content-Length": buffer.byteLength.toString(),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
    body: new Uint8Array(buffer),
  };
}
