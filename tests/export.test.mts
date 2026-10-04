import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  generateQuotationDocx,
  getQuotationDocxFilename,
  processQuotationExport,
  WorkingDocument,
  getCellText,
  getCanonicalTemplatePath,
  computeFileSha256,
  CANONICAL_TEMPLATE_SHA256,
} from "../lib/documents/index.ts";
import { formatCurrency } from "../lib/calculations/index.ts";
import type { QuotationWithItems, DatabaseQuotationItem } from "../types/quotation.ts";

/**
 * Fixture factory to generate an authoritative saved quotation snapshot with N items.
 */
function createSavedQuotationFixture(itemCount: number, overrides?: Partial<QuotationWithItems>): QuotationWithItems {
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

/* =========================================================================
 * PHASE 14 — DOCX EXPORT TESTS
 * ========================================================================= */

test("1. One-item export: generates valid DOCX with all header, customer, item, and total fields populated", async () => {
  const quotation = createSavedQuotationFixture(1, {
    qf_number: "QF-2026-0001",
    quotation_date: "2026-10-04",
    customer_name: "Solo Builders Inc.",
    customer_address: "123 Pioneer St, Mandaluyong",
    contact_person: "Ana Reyes",
    contact_number: "0918-111-2222",
    total_amount: 110,
    items: [
      {
        id: "item-1",
        quotation_id: "quote-uuid-fixture",
        product_id: null,
        item_number: 1,
        item_description: "Heavy Duty Anchor Bolt M16",
        brand_name: "Hilti",
        uom: "pc",
        unit_price: 110,
        quantity: 1,
        item_total: 110,
        created_at: "2026-10-04T12:00:00Z",
      },
    ],
  });

  const buffer = await generateQuotationDocx(quotation);
  assert.ok(Buffer.isBuffer(buffer), "Export must produce a Node Buffer");
  assert.ok(buffer.length > 0, "Buffer must not be empty");

  // Reload and inspect document content
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();

  // Table 1 (Header)
  assert.ok(targets.table1.dateTextNode?.textContent?.includes("2026-10-04"));
  assert.ok(targets.table1.qfNumberTextNode?.textContent?.includes("QF-2026-0001"));

  // Table 2 (Customer)
  assert.strictEqual(getCellText(targets.table2.nameCell), "Solo Builders Inc.");
  assert.strictEqual(getCellText(targets.table2.addressCell), "123 Pioneer St, Mandaluyong");
  assert.strictEqual(getCellText(targets.table2.contactPersonCell), "Ana Reyes");
  assert.strictEqual(getCellText(targets.table2.contactNumberCell), "0918-111-2222");

  // Table 3 (Items)
  const itemRows = targets.table3.itemRows;
  assert.strictEqual(itemRows.length, 1);
  assert.strictEqual(getCellText(itemRows[0].itemNumberCell), "1");
  assert.strictEqual(getCellText(itemRows[0].descriptionCell), "Heavy Duty Anchor Bolt M16");
  assert.strictEqual(getCellText(itemRows[0].brandCell), "Hilti");
  assert.strictEqual(getCellText(itemRows[0].uomCell), "pc");
  assert.strictEqual(getCellText(itemRows[0].unitPriceCell), formatCurrency(110));
  assert.strictEqual(getCellText(itemRows[0].quantityCell), "1");
  assert.strictEqual(getCellText(itemRows[0].totalCell), formatCurrency(110));

  // Table 4 (Grand Total)
  assert.strictEqual(getCellText(targets.table4.grandTotalCell), formatCurrency(110));
});

test("2. Six-item export: preserves native template 6 rows and accurately populates all 6 item rows", async () => {
  const quotation = createSavedQuotationFixture(6);
  const buffer = await generateQuotationDocx(quotation);
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();

  assert.strictEqual(targets.table3.itemRows.length, 6);

  for (let i = 0; i < 6; i++) {
    const row = targets.table3.itemRows[i];
    const item = quotation.items[i];
    assert.strictEqual(getCellText(row.itemNumberCell), String(item.item_number));
    assert.strictEqual(getCellText(row.descriptionCell), item.item_description);
    assert.strictEqual(getCellText(row.brandCell), item.brand_name || "");
    assert.strictEqual(getCellText(row.uomCell), item.uom);
    assert.strictEqual(getCellText(row.unitPriceCell), formatCurrency(item.unit_price));
    assert.strictEqual(getCellText(row.quantityCell), String(item.quantity));
    assert.strictEqual(getCellText(row.totalCell), formatCurrency(item.item_total));
  }

  assert.strictEqual(getCellText(targets.table4.grandTotalCell), formatCurrency(quotation.total_amount));
  assert.strictEqual(reloaded.isTotalRowLast(), true);
});

test("3. Seven-item export: dynamic prototype cloning generates 7th item row with total row remaining last", async () => {
  const quotation = createSavedQuotationFixture(7);
  const buffer = await generateQuotationDocx(quotation);
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();

  assert.strictEqual(targets.table3.itemRows.length, 7);

  // Check 7th row specifically (cloned prototype row)
  const seventhRow = targets.table3.itemRows[6];
  const item7 = quotation.items[6];
  assert.strictEqual(getCellText(seventhRow.itemNumberCell), "7");
  assert.strictEqual(getCellText(seventhRow.descriptionCell), item7.item_description);
  assert.strictEqual(getCellText(seventhRow.totalCell), formatCurrency(item7.item_total));

  // Total row is last
  assert.strictEqual(reloaded.isTotalRowLast(), true);
  assert.strictEqual(getCellText(targets.table4.grandTotalCell), formatCurrency(quotation.total_amount));
});

test("4. Twenty-item export: all 20 saved items are accurately represented and ordered", async () => {
  const quotation = createSavedQuotationFixture(20);
  const buffer = await generateQuotationDocx(quotation);
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();

  assert.strictEqual(targets.table3.itemRows.length, 20);

  // Validate all 20 item numbers and totals
  for (let i = 0; i < 20; i++) {
    const row = targets.table3.itemRows[i];
    assert.strictEqual(getCellText(row.itemNumberCell), String(i + 1));
    assert.strictEqual(getCellText(row.totalCell), formatCurrency(quotation.items[i].item_total));
  }

  assert.strictEqual(reloaded.isTotalRowLast(), true);
  assert.strictEqual(getCellText(targets.table4.grandTotalCell), formatCurrency(quotation.total_amount));
});

test("5. Fifty-item export: stress handles 50 item rows without degradation", async () => {
  const quotation = createSavedQuotationFixture(50);
  const buffer = await generateQuotationDocx(quotation);
  assert.ok(buffer.length > 0);

  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();

  assert.strictEqual(targets.table3.itemRows.length, 50);
  assert.strictEqual(getCellText(targets.table3.itemRows[49].itemNumberCell), "50");
  assert.strictEqual(reloaded.isTotalRowLast(), true);
  assert.strictEqual(getCellText(targets.table4.grandTotalCell), formatCurrency(quotation.total_amount));
});

test("6. Historical snapshot test: uses saved quotation snapshot values, ignoring any current catalog modifications", async () => {
  // Scenario: Quotation created with a product ID.
  // The catalog has since updated the product's name, brand, UOM, and price.
  const historicalQuotation = createSavedQuotationFixture(1, {
    items: [
      {
        id: "item-hist-1",
        quotation_id: "quote-uuid-fixture",
        product_id: "prod-cement-001", // References a catalog product
        item_number: 1,
        item_description: "Portland Cement Type 1 (Original Historical Spec 40kg)",
        brand_name: "Original Holcim Historical",
        uom: "bag-historical",
        unit_price: 240, // Historical unit price
        quantity: 100,
        item_total: 24000, // Historical total
        created_at: "2026-04-01T10:00:00Z",
      },
    ],
    total_amount: 24000,
  });

  // Current live catalog has different price (₱320) and description:
  // "Holcim Solido Eco-Planet 40kg bag" @ ₱320.00
  // DOCX export must strictly render the saved snapshot, not catalog values:
  const buffer = await generateQuotationDocx(historicalQuotation);
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();
  const row = targets.table3.itemRows[0];

  assert.strictEqual(getCellText(row.descriptionCell), "Portland Cement Type 1 (Original Historical Spec 40kg)");
  assert.strictEqual(getCellText(row.brandCell), "Original Holcim Historical");
  assert.strictEqual(getCellText(row.uomCell), "bag-historical");
  assert.strictEqual(getCellText(row.unitPriceCell), formatCurrency(240));
  assert.strictEqual(getCellText(row.totalCell), formatCurrency(24000));
  assert.strictEqual(getCellText(targets.table4.grandTotalCell), formatCurrency(24000));
});

test("7. Manual item test: exports items where product_id is null using snapshot fields", async () => {
  const uncataloguedQuotation = createSavedQuotationFixture(1, {
    items: [
      {
        id: "manual-item-1",
        quotation_id: "quote-uuid-fixture",
        product_id: null, // Custom/manual uncatalogued item
        item_number: 1,
        item_description: "Custom Stainless Fabrication 304 Bracket",
        brand_name: null, // No brand
        uom: "lot",
        unit_price: 5500,
        quantity: 2,
        item_total: 11000,
        created_at: "2026-10-04T12:00:00Z",
      },
    ],
    total_amount: 11000,
  });

  const buffer = await generateQuotationDocx(uncataloguedQuotation);
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();
  const row = targets.table3.itemRows[0];

  assert.strictEqual(getCellText(row.descriptionCell), "Custom Stainless Fabrication 304 Bracket");
  assert.strictEqual(getCellText(row.brandCell), ""); // Null brand safely rendered as empty string
  assert.strictEqual(getCellText(row.uomCell), "lot");
  assert.strictEqual(getCellText(row.unitPriceCell), formatCurrency(5500));
  assert.strictEqual(getCellText(row.totalCell), formatCurrency(11000));
});

test("8. Optional contact fields: safely handles NULL contact person and contact number without literal 'null' or 'undefined'", async () => {
  const quotationNullContacts = createSavedQuotationFixture(1, {
    contact_person: null,
    contact_number: null,
  });

  const buffer = await generateQuotationDocx(quotationNullContacts);
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();

  // Contact cells must be clean and empty
  assert.strictEqual(getCellText(targets.table2.contactPersonCell), "");
  assert.strictEqual(getCellText(targets.table2.contactNumberCell), "");

  // Verify XML content has no literal "null" or "undefined"
  const xml = reloaded.serializeXml();
  assert.strictEqual(xml.includes(">null<"), false, "Must not contain literal 'null' text node");
  assert.strictEqual(xml.includes(">undefined<"), false, "Must not contain literal 'undefined' text node");
});

test("9. Total integrity: displays saved quotations.total_amount without recalculation", async () => {
  // Scenario: Persisted quotation has an authoritative saved total amount.
  // Export must directly format and inject this saved value.
  const quotation = createSavedQuotationFixture(2, {
    total_amount: 99999.50, // Specific saved authoritative value
  });

  const buffer = await generateQuotationDocx(quotation);
  const reloaded = await WorkingDocument.load(buffer);
  const targets = reloaded.getTargets();

  assert.strictEqual(getCellText(targets.table4.grandTotalCell), "₱ 99,999.50");
});

test("10. Fixed-content preservation: retains all legal, terms, secretariat, and signature sections untouched", async () => {
  const quotation = createSavedQuotationFixture(3);
  const buffer = await generateQuotationDocx(quotation);

  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml, "word/document.xml must exist in exported package");

  // Representative fixed template sections
  assert.ok(xml.includes("Terms and Conditions:"), "Terms and Conditions section must be preserved");
  assert.ok(xml.includes("Privacy Statements:"), "Privacy Statements section must be preserved");
  assert.ok(xml.includes("Modes of Payment:"), "Modes of Payment section must be preserved");
  assert.ok(xml.includes("Secretariat Name"), "Secretariat Name placeholder must be preserved");
  assert.ok(xml.includes("Secretariat"), "Secretariat title must be preserved");
  assert.ok(xml.includes("COMPANY DETAILS"), "COMPANY DETAILS heading must be preserved");
  assert.ok(xml.includes("QUOTATION DETAILS"), "QUOTATION DETAILS heading must be preserved");
  assert.ok(xml.includes("FORMAL QUOTATION"), "FORMAL QUOTATION title must be preserved");
});

test("11. Canonical template integrity: disk template SHA-256 remains 86020610DC7773AB65FA4BD944EE467FB6A789294701BE43B19DCF23493F4CA8", async () => {
  const canonicalPath = getCanonicalTemplatePath();
  const currentHash = await computeFileSha256(canonicalPath);
  assert.strictEqual(
    currentHash,
    CANONICAL_TEMPLATE_SHA256,
    "The canonical template file on disk must never be modified by export operations!"
  );
});

test("12. DOCX reload test: generated buffer is a valid ZIP and reloads cleanly into WorkingDocument", async () => {
  const quotation = createSavedQuotationFixture(5);
  const buffer = await generateQuotationDocx(quotation);

  // 1. Reload as JSZip
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file("[Content_Types].xml"), "Must contain [Content_Types].xml");
  assert.ok(zip.file("word/document.xml"), "Must contain word/document.xml");

  // 2. Reload as WorkingDocument
  const doc = await WorkingDocument.load(buffer, { verifyIntegrity: false });
  assert.strictEqual(doc.getTables().length, 4);
  assert.strictEqual(doc.isTotalRowLast(), true);
  assert.doesNotThrow(() => doc.validateDocumentStructure());
});

test("13. Authentication test: unauthenticated export request is rejected with 401", async () => {
  const quotation = createSavedQuotationFixture(1);

  // When session is null, processQuotationExport immediately rejects with 401
  const response = await processQuotationExport(null, quotation, quotation.id);
  assert.strictEqual(response.status, 401);
  assert.strictEqual(response.body, "Unauthorized");
});

test("14. Missing quotation and validation tests: nonexistent quotation returns 404, invalid ID returns 400", async () => {
  const dummySession = {
    userId: "usr_dev_admin_001",
    username: "admin",
    displayName: "Admin User",
    expiresAt: Date.now() + 3600000,
  };
  const quotation = createSavedQuotationFixture(1);

  // 1. Nonexistent quotation (quotation is null) -> 404
  const res404 = await processQuotationExport(dummySession, null, "non-existent-id");
  assert.strictEqual(res404.status, 404);
  assert.strictEqual(res404.body, "Quotation not found");

  // 2. Empty ID parameter -> 400
  const res400EmptyId = await processQuotationExport(dummySession, quotation, "");
  assert.strictEqual(res400EmptyId.status, 400);
  assert.strictEqual(res400EmptyId.body, "Invalid quotation ID");

  // 3. Null ID parameter -> 400
  const res400NullId = await processQuotationExport(dummySession, quotation, null);
  assert.strictEqual(res400NullId.status, 400);
  assert.strictEqual(res400NullId.body, "Invalid quotation ID");

  // 4. Quotation with 0 items -> 400
  const quotationEmptyItems = { ...quotation, items: [] };
  const res400EmptyItems = await processQuotationExport(dummySession, quotationEmptyItems, quotation.id);
  assert.strictEqual(res400EmptyItems.status, 400);
  assert.strictEqual(res400EmptyItems.body, "Quotation contains no line items to export");

  // 5. Valid session + quotation -> 200 with binary DOCX attachment
  const res200 = await processQuotationExport(dummySession, quotation, quotation.id);
  assert.strictEqual(res200.status, 200);
  assert.strictEqual(
    res200.headers["Content-Type"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  assert.ok(res200.headers["Content-Disposition"].includes("attachment"));
  assert.ok(res200.body instanceof Uint8Array);
  assert.ok(res200.body.byteLength > 0);
});

test("15. No mutation test: export is strictly read-only and does not mutate database or input records", async () => {
  const quotation = createSavedQuotationFixture(3);
  const quotationJsonBefore = JSON.stringify(quotation);

  // Generate document
  const buffer = await generateQuotationDocx(quotation);
  assert.ok(buffer.length > 0);

  // Verify input quotation object was not mutated
  const quotationJsonAfter = JSON.stringify(quotation);
  assert.strictEqual(
    quotationJsonBefore,
    quotationJsonAfter,
    "Quotation object must remain completely unmodified by export"
  );
});

test("16. Safe filename helper: sanitizes QF numbers and prevents path traversal", () => {
  assert.strictEqual(getQuotationDocxFilename("QF-2026-0001"), "QF-2026-0001.docx");
  assert.strictEqual(getQuotationDocxFilename("JJ-CLAVERIA-QF-2026-001"), "JJ-CLAVERIA-QF-2026-001.docx");
  assert.strictEqual(getQuotationDocxFilename("../../etc/passwd"), "etc-passwd.docx");
  assert.strictEqual(getQuotationDocxFilename("..\\..\\windows\\system32"), "windows-system32.docx");
  assert.strictEqual(getQuotationDocxFilename("QF#2026/001:Special*"), "QF-2026-001-Special.docx");
  assert.strictEqual(getQuotationDocxFilename(null), "quotation.docx");
  assert.strictEqual(getQuotationDocxFilename(""), "quotation.docx");
});
