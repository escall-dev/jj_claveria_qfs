import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  convertDocxToPdf,
  processQuotationExport,
  processQuotationPdfExport,
  processQuotationPdfPreview,
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
    const unitPrice = 125.5 + i * 15.25;
    const quantity = i * 2.5;
    const itemTotal = Math.round(unitPrice * quantity * 100) / 100;
    runningTotal += itemTotal;

    items.push({
      id: `item-uuid-preview-${i}`,
      quotation_id: overrides?.id || "quote-preview-fixture-001",
      product_id: i % 2 === 0 ? `prod-catalog-${i}` : null,
      item_number: i,
      item_description: `Industrial Construction Material Grade #${i}`,
      brand_name: i % 2 === 0 ? `BrandAlpha-${i}` : null,
      uom: i % 3 === 0 ? "bag" : "pc",
      unit_price: unitPrice,
      quantity,
      item_total: itemTotal,
      created_at: "2026-10-06T12:00:00Z",
    });
  }

  return {
    id: "quote-preview-fixture-001",
    qf_number: "QF-20261006-PREV",
    quotation_date: "2026-10-06",
    customer_id: "cust-uuid-preview-001",
    customer_name: "Metropolis Heavy Industries Inc.",
    customer_address: "Lot 8, Block 12, Industrial Estate, Santa Rosa, Laguna",
    contact_person: "Engr. Roberto Dela Cruz",
    contact_number: "0918-555-0199",
    total_amount: Math.round(runningTotal * 100) / 100,
    status: "draft",
    created_by: "usr_dev_admin_001",
    created_at: "2026-10-06T12:00:00Z",
    updated_at: "2026-10-06T12:00:00Z",
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
 * PHASE 16 — ADVANCED DOCUMENT PREVIEW WORKFLOW TESTS
 * ========================================================================= */

test("1. Environment & Pre-flight: LibreOffice and canonical template intact", async () => {
  const binaryPath = resolveLibreOfficePath();
  assert.ok(binaryPath, "LibreOffice executable path must be resolved");
  assert.ok(fs.existsSync(binaryPath), `Resolved executable must exist at: ${binaryPath}`);

  const canonicalPath = getCanonicalTemplatePath();
  const currentHash = await computeFileSha256(canonicalPath);
  assert.strictEqual(
    currentHash,
    CANONICAL_TEMPLATE_SHA256,
    "Canonical template file on disk must strictly match canonical checksum"
  );
});

test("2. Preview route/API behavior: returns 200 with application/pdf and inline disposition", async () => {
  const quotation = createSavedQuotationFixture(2, {
    qf_number: "JJ-CLAVERIA-QF-2026-PREV01",
  });

  const result = await processQuotationPdfPreview(dummySession, quotation, quotation.id);

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.headers["Content-Type"], "application/pdf");
  assert.notStrictEqual(result.headers["Content-Type"], "text/plain");

  // Content-Disposition must strictly be inline for browser embedded rendering
  assert.ok(
    result.headers["Content-Disposition"].startsWith("inline;"),
    `Expected disposition to start with 'inline;', got '${result.headers["Content-Disposition"]}'`
  );
  assert.ok(
    result.headers["Content-Disposition"].includes('filename="JJ-CLAVERIA-QF-2026-PREV01.pdf"')
  );

  // Cache-Control must prevent caching sensitive draft quotation documents
  assert.strictEqual(
    result.headers["Cache-Control"],
    "private, no-cache, no-store, must-revalidate"
  );

  // Body must strictly be a binary Uint8Array containing valid PDF
  assert.ok(result.body instanceof Uint8Array);
  const bytes = result.body as Uint8Array;
  assert.strictEqual(bytes[0], 0x25); // '%'
  assert.strictEqual(bytes[1], 0x50); // 'P'
  assert.strictEqual(bytes[2], 0x44); // 'D'
  assert.strictEqual(bytes[3], 0x46); // 'F'
  assert.strictEqual(bytes[4], 0x2d); // '-'
  assert.ok(bytes.byteLength > 50000, "Preview PDF document must have substantive byte length");
});

test("3. Successful PDF preview generation: 1-item quotation snapshot", async () => {
  const quotation = createSavedQuotationFixture(1, {
    qf_number: "QF-PREV-SINGLE-01",
  });

  const result = await processQuotationPdfPreview(dummySession, quotation, quotation.id);
  assert.strictEqual(result.status, 200);
  assert.ok(result.body instanceof Uint8Array);
  assert.ok((result.body as Uint8Array).byteLength > 40000);
});

test("4. Successful PDF preview generation: multi-item quotation (5 items)", async () => {
  const quotation = createSavedQuotationFixture(5, {
    qf_number: "QF-PREV-MULTI-05",
  });

  const result = await processQuotationPdfPreview(dummySession, quotation, quotation.id);
  assert.strictEqual(result.status, 200);
  assert.ok(result.body instanceof Uint8Array);
  assert.ok((result.body as Uint8Array).byteLength > 50000);
});

test("5. Successful PDF preview generation: multi-page quotation (20 items)", async () => {
  const quotation = createSavedQuotationFixture(20, {
    qf_number: "QF-PREV-LONG-20",
  });

  const result = await processQuotationPdfPreview(dummySession, quotation, quotation.id);
  assert.strictEqual(result.status, 200);
  assert.ok(result.body instanceof Uint8Array);
  assert.ok((result.body as Uint8Array).byteLength > 55000);
});

test("6. Missing quotation: returns 404 Not Found", async () => {
  const result = await processQuotationPdfPreview(dummySession, null, "non-existent-preview-id");
  assert.strictEqual(result.status, 404);
  assert.strictEqual(result.headers["Content-Type"], "text/plain");
  assert.strictEqual(result.body, "Quotation not found");
});

test("7. Unauthorized quotation access: unauthenticated request returns 401 Unauthorized", async () => {
  const quotation = createSavedQuotationFixture(1);
  const result = await processQuotationPdfPreview(null, quotation, quotation.id);
  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.headers["Content-Type"], "text/plain");
  assert.strictEqual(result.body, "Unauthorized");
});

test("8. Invalid quotation ID parameter: empty string and null return 400 Bad Request", async () => {
  const quotation = createSavedQuotationFixture(1);

  const resEmptyId = await processQuotationPdfPreview(dummySession, quotation, "");
  assert.strictEqual(resEmptyId.status, 400);
  assert.strictEqual(resEmptyId.headers["Content-Type"], "text/plain");
  assert.strictEqual(resEmptyId.body, "Invalid quotation ID");

  const resNullId = await processQuotationPdfPreview(dummySession, quotation, null);
  assert.strictEqual(resNullId.status, 400);
  assert.strictEqual(resNullId.headers["Content-Type"], "text/plain");
  assert.strictEqual(resNullId.body, "Invalid quotation ID");
});

test("9. Quotation with no line items: returns 400 Bad Request", async () => {
  const quotationEmptyItems = createSavedQuotationFixture(0, { items: [] });
  const result = await processQuotationPdfPreview(
    dummySession,
    quotationEmptyItems,
    quotationEmptyItems.id
  );
  assert.strictEqual(result.status, 400);
  assert.strictEqual(result.headers["Content-Type"], "text/plain");
  assert.strictEqual(result.body, "Quotation contains no line items to export");
});

test("10. Export failure / Conversion error handling: rejects invalid DOCX buffer cleanly", async () => {
  await assert.rejects(
    async () => {
      await convertDocxToPdf(Buffer.alloc(0));
    },
    {
      name: "ValidationError",
    }
  );
});

test("11. Content-Disposition differentiation: preview is inline, export is attachment", async () => {
  const quotation = createSavedQuotationFixture(2, {
    qf_number: "QF-DISP-COMPARE-01",
  });

  const previewResult = await processQuotationPdfPreview(dummySession, quotation, quotation.id);
  const exportResult = await processQuotationPdfExport(dummySession, quotation, quotation.id);

  assert.ok(
    previewResult.headers["Content-Disposition"].startsWith("inline;"),
    "Preview must use inline disposition"
  );
  assert.ok(
    exportResult.headers["Content-Disposition"].startsWith("attachment;"),
    "Export must use attachment disposition"
  );
  assert.strictEqual(
    previewResult.headers["Content-Type"],
    exportResult.headers["Content-Type"],
    "Both preview and export must use application/pdf MIME type"
  );
});

test("12. ProcessQuotationPdfExport supports explicit disposition parameter", async () => {
  const quotation = createSavedQuotationFixture(1, {
    qf_number: "QF-PARAM-TEST-01",
  });

  const inlineResult = await processQuotationPdfExport(dummySession, quotation, quotation.id, {
    disposition: "inline",
  });
  assert.ok(inlineResult.headers["Content-Disposition"].startsWith("inline;"));

  const attachmentResult = await processQuotationPdfExport(dummySession, quotation, quotation.id, {
    disposition: "attachment",
  });
  assert.ok(attachmentResult.headers["Content-Disposition"].startsWith("attachment;"));

  const defaultResult = await processQuotationPdfExport(dummySession, quotation, quotation.id);
  assert.ok(defaultResult.headers["Content-Disposition"].startsWith("attachment;"));
});

test("13. Historical snapshot safety: preview generation does not mutate quotation object or items", async () => {
  const quotation = createSavedQuotationFixture(3);
  const beforeJson = JSON.stringify(quotation);

  const result = await processQuotationPdfPreview(dummySession, quotation, quotation.id);
  assert.strictEqual(result.status, 200);

  const afterJson = JSON.stringify(quotation);
  assert.strictEqual(
    beforeJson,
    afterJson,
    "Input quotation snapshot must remain strictly immutable during preview generation"
  );
});

test("14. Canonical template immutability: disk template SHA-256 strictly preserved after preview generation", async () => {
  const canonicalPath = getCanonicalTemplatePath();
  const currentHash = await computeFileSha256(canonicalPath);
  assert.strictEqual(
    currentHash,
    CANONICAL_TEMPLATE_SHA256,
    "Canonical template file on disk must never be modified by preview operations"
  );
});

test("15. Existing DOCX export remains functional (regression guard)", async () => {
  const quotation = createSavedQuotationFixture(2, {
    qf_number: "QF-DOCX-REGRESSION-01",
  });

  const result = await processQuotationExport(dummySession, quotation, quotation.id);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(
    result.headers["Content-Type"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  assert.ok(result.headers["Content-Disposition"].startsWith("attachment;"));
  assert.ok(result.body instanceof Uint8Array);

  // Magic bytes check for ZIP (PK\x03\x04)
  const bytes = result.body as Uint8Array;
  assert.strictEqual(bytes[0], 0x50);
  assert.strictEqual(bytes[1], 0x4b);
  assert.strictEqual(bytes[2], 0x03);
  assert.strictEqual(bytes[3], 0x04);
});

test("16. Existing PDF export remains functional (regression guard)", async () => {
  const quotation = createSavedQuotationFixture(2, {
    qf_number: "QF-PDF-REGRESSION-01",
  });

  const result = await processQuotationPdfExport(dummySession, quotation, quotation.id);
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.headers["Content-Type"], "application/pdf");
  assert.ok(result.headers["Content-Disposition"].startsWith("attachment;"));
  assert.ok(result.body instanceof Uint8Array);

  const bytes = result.body as Uint8Array;
  assert.strictEqual(bytes[0], 0x25); // '%'
  assert.strictEqual(bytes[1], 0x50); // 'P'
  assert.strictEqual(bytes[2], 0x44); // 'D'
  assert.strictEqual(bytes[3], 0x46); // 'F'
  assert.strictEqual(bytes[4], 0x2d); // '-'
});
