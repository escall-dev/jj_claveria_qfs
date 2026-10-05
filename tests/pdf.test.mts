import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  generateQuotationDocx,
  generateQuotationPdf,
  convertDocxToPdf,
  getQuotationPdfFilename,
  processQuotationPdfExport,
  resolveLibreOfficePath,
  getCanonicalTemplatePath,
  computeFileSha256,
  CANONICAL_TEMPLATE_SHA256,
} from "../lib/documents/index.ts";
import type { QuotationWithItems, DatabaseQuotationItem } from "../types/quotation.ts";

/**
 * Fixture factory to generate an authoritative saved quotation snapshot with N items.
 */
function createSavedQuotationFixture(
  itemCount: number,
  overrides?: Partial<QuotationWithItems>
): QuotationWithItems {
  const items: DatabaseQuotationItem[] = [];
  let runningTotal = 0;

  for (let i = 1; i <= itemCount; i++) {
    const unitPrice = 100 + i * 10;
    const quantity = i;
    const itemTotal = unitPrice * quantity;
    runningTotal += itemTotal;

    items.push({
      id: `item-uuid-${i}`,
      quotation_id: overrides?.id || "quote-uuid-fixture",
      product_id: i % 2 === 0 ? `prod-catalog-${i}` : null,
      item_number: i,
      item_description: `High Grade Building Material Item #${i}`,
      brand_name: i % 2 === 0 ? `BrandAlpha-${i}` : null,
      uom: i % 3 === 0 ? "bag" : "pc",
      unit_price: unitPrice,
      quantity,
      item_total: itemTotal,
      created_at: "2026-10-04T12:00:00Z",
    });
  }

  return {
    id: "quote-uuid-fixture",
    qf_number: "QF-20261004-0042",
    quotation_date: "2026-10-04",
    customer_id: "cust-uuid-001",
    customer_name: "Apex Engineering & Construction Corp.",
    customer_address: "Bldg 4, Laguna Technopark, Biñan, Laguna",
    contact_person: "Engr. Marco Santos",
    contact_number: "0917-888-9999",
    total_amount: runningTotal,
    status: "draft",
    created_by: "usr_dev_admin_001",
    created_at: "2026-10-04T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
    items,
    ...overrides,
  };
}

const dummySession = {
  userId: "usr_dev_admin_001",
  username: "admin",
  displayName: "Admin User",
  expiresAt: Date.now() + 3600000,
};

/* =========================================================================
 * PHASE 15 — PDF EXPORT TESTS
 * ========================================================================= */

test("1. Environment & Binary Discovery: finds valid LibreOffice executable", () => {
  const binaryPath = resolveLibreOfficePath();
  assert.ok(binaryPath, "LibreOffice executable path must be resolved");
  assert.ok(fs.existsSync(binaryPath), `Resolved executable must exist at: ${binaryPath}`);
});

test("2. Low-level DOCX-to-PDF Conversion: converts raw Phase 14 DOCX buffer to valid PDF buffer", async () => {
  const quotation = createSavedQuotationFixture(1);
  const docxBuffer = await generateQuotationDocx(quotation);
  assert.ok(Buffer.isBuffer(docxBuffer));

  const pdfBuffer = await convertDocxToPdf(docxBuffer);
  assert.ok(Buffer.isBuffer(pdfBuffer), "Result must be a Node Buffer");
  assert.ok(pdfBuffer.length > 0, "PDF buffer must not be empty");

  // Magic bytes check: %PDF-
  const header = pdfBuffer.subarray(0, 5).toString("ascii");
  assert.strictEqual(header, "%PDF-", "PDF must begin with '%PDF-' magic bytes");
  assert.ok(pdfBuffer.length > 50000, "Official quotation PDF should be substantial in size");
});

test("3. One-item PDF export: generates complete valid PDF from 1-item snapshot", async () => {
  const quotation = createSavedQuotationFixture(1, {
    qf_number: "QF-2026-0001",
    customer_name: "Single Item Corporation",
  });

  const pdfBuffer = await generateQuotationPdf(quotation);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.strictEqual(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdfBuffer.includes("%%EOF"), "PDF must contain standard EOF marker");
});

test("4. Five-item PDF export: converts native 5-item quotation to valid PDF", async () => {
  const quotation = createSavedQuotationFixture(5, {
    qf_number: "QF-2026-0005",
  });

  const pdfBuffer = await generateQuotationPdf(quotation);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.strictEqual(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdfBuffer.includes("%%EOF"));
});

test("5. Twenty-item PDF export: converts multi-page dynamic 20-item quotation to valid PDF", async () => {
  const quotation = createSavedQuotationFixture(20, {
    qf_number: "QF-2026-0020",
  });

  const pdfBuffer = await generateQuotationPdf(quotation);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.strictEqual(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdfBuffer.length > 100000, "20-item PDF must be large enough to contain all items");
  assert.ok(pdfBuffer.includes("%%EOF"));
});

test("6. Fifty-item PDF export: stress converts 50 dynamic items without failure or corruption", async () => {
  const quotation = createSavedQuotationFixture(50, {
    qf_number: "QF-2026-0050",
  });

  const pdfBuffer = await generateQuotationPdf(quotation);
  assert.ok(Buffer.isBuffer(pdfBuffer));
  assert.strictEqual(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(pdfBuffer.length > 150000, "50-item PDF must accommodate multiple pages cleanly");
  assert.ok(pdfBuffer.includes("%%EOF"));
});

test("7. Route response: returns successful 200 with proper Content-Type and Content-Disposition", async () => {
  const quotation = createSavedQuotationFixture(3, {
    qf_number: "JJ-CLAVERIA-QF-2026-007",
  });

  const result = await processQuotationPdfExport(dummySession, quotation, quotation.id);

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.headers["Content-Type"], "application/pdf");
  assert.notStrictEqual(result.headers["Content-Type"], "text/plain");

  // Content-Disposition must attach a .pdf file
  assert.ok(result.headers["Content-Disposition"].startsWith("attachment;"));
  assert.ok(result.headers["Content-Disposition"].includes('filename="JJ-CLAVERIA-QF-2026-007.pdf"'));
  assert.ok(
    result.headers["Content-Disposition"].endsWith(".pdf") ||
    result.headers["Content-Disposition"].endsWith('.pdf"')
  );

  // Body must strictly be a binary Uint8Array, NOT a string
  assert.ok(result.body instanceof Uint8Array);
  const bytes = result.body as Uint8Array;
  assert.strictEqual(bytes[0], 0x25); // '%'
  assert.strictEqual(bytes[1], 0x50); // 'P'
  assert.strictEqual(bytes[2], 0x44); // 'D'
  assert.strictEqual(bytes[3], 0x46); // 'F'
  assert.strictEqual(bytes[4], 0x2d); // '-'
});

test("8. Authentication guard: unauthenticated request returns 401 Unauthorized", async () => {
  const quotation = createSavedQuotationFixture(1);

  // When session is null, processQuotationPdfExport must reject with 401
  const result = await processQuotationPdfExport(null, quotation, quotation.id);
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.headers["Content-Type"], "text/plain");
  assert.strictEqual(result.body, "Unauthorized");
});

test("9. Validation guards: 404 for missing quotation, 400 for invalid ID, 400 for empty items", async () => {
  const quotation = createSavedQuotationFixture(1);

  // 1. Nonexistent quotation (quotation is null) -> 404
  const res404 = await processQuotationPdfExport(dummySession, null, "non-existent-id");
  assert.strictEqual(res404.status, 404);
  assert.strictEqual(res404.headers["Content-Type"], "text/plain");
  assert.strictEqual(res404.body, "Quotation not found");

  // 2. Empty ID parameter -> 400
  const res400EmptyId = await processQuotationPdfExport(dummySession, quotation, "");
  assert.strictEqual(res400EmptyId.status, 400);
  assert.strictEqual(res400EmptyId.headers["Content-Type"], "text/plain");
  assert.strictEqual(res400EmptyId.body, "Invalid quotation ID");

  // 3. Null ID parameter -> 400
  const res400NullId = await processQuotationPdfExport(dummySession, quotation, null);
  assert.strictEqual(res400NullId.status, 400);
  assert.strictEqual(res400NullId.body, "Invalid quotation ID");

  // 4. Quotation with 0 items -> 400
  const quotationEmptyItems = { ...quotation, items: [] };
  const res400EmptyItems = await processQuotationPdfExport(dummySession, quotationEmptyItems, quotation.id);
  assert.strictEqual(res400EmptyItems.status, 400);
  assert.strictEqual(res400EmptyItems.body, "Quotation contains no line items to export");
});

test("10. Historical snapshot safety: PDF generation does not mutate quotation object or items", async () => {
  const quotation = createSavedQuotationFixture(3);
  const quotationJsonBefore = JSON.stringify(quotation);

  const pdfBuffer = await generateQuotationPdf(quotation);
  assert.ok(pdfBuffer.length > 0);

  const quotationJsonAfter = JSON.stringify(quotation);
  assert.strictEqual(
    quotationJsonBefore,
    quotationJsonAfter,
    "Input quotation snapshot must remain strictly immutable during PDF generation"
  );
});

test("11. Canonical template immutability: disk template SHA-256 remains strictly unchanged after PDF export", async () => {
  const canonicalPath = getCanonicalTemplatePath();
  const currentHash = await computeFileSha256(canonicalPath);
  assert.strictEqual(
    currentHash,
    CANONICAL_TEMPLATE_SHA256,
    "Canonical template file on disk must never be modified by PDF export operations!"
  );
});

test("12. Safe PDF filename helper: sanitizes QF numbers and prevents path traversal", () => {
  assert.strictEqual(getQuotationPdfFilename("QF-2026-0001"), "QF-2026-0001.pdf");
  assert.strictEqual(getQuotationPdfFilename("JJ-CLAVERIA-QF-2026-001"), "JJ-CLAVERIA-QF-2026-001.pdf");
  assert.strictEqual(getQuotationPdfFilename("../../etc/passwd"), "etc-passwd.pdf");
  assert.strictEqual(getQuotationPdfFilename("..\\..\\windows\\system32"), "windows-system32.pdf");
  assert.strictEqual(getQuotationPdfFilename("QF#2026/001:Special*"), "QF-2026-001-Special.pdf");
  assert.strictEqual(getQuotationPdfFilename(null), "quotation.pdf");
  assert.strictEqual(getQuotationPdfFilename(""), "quotation.pdf");
});

test("13. Conversion error handling: rejects empty or invalid DOCX buffers cleanly", async () => {
  await assert.rejects(
    async () => {
      await convertDocxToPdf(Buffer.alloc(0));
    },
    {
      name: "ValidationError",
    }
  );
});
