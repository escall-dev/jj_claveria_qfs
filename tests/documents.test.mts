import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CANONICAL_TEMPLATE_SHA256,
  CANONICAL_TEMPLATE_BYTE_SIZE,
  getCanonicalTemplatePath,
  verifyTemplateIntegrity,
  loadTemplateBuffer,
  assertNotCanonicalTemplate,
  computeFileSha256,
  getTemplateMetadata,
  WorkingDocument,
  ITEM_TABLE_COLUMN_WIDTHS_DXA,
  setDateAndQfNumber,
  setCustomerField,
  setGrandTotal,
  populateItemRow,
  getCellText,
  getChildElements,
  prepareItemRows,
  generateItemRows,
  createCleanItemRowClone,
  validateItemCount,
  validateQuotationDocumentStructure,
} from "../lib/documents/index.ts";
import {
  TemplateNotFoundError,
  TemplateIntegrityError,
  TemplateImmutabilityError,
  DocumentStructureError,
  DocumentItemCountError,
  ValidationError,
} from "../lib/errors.ts";

test("1. Template existence: locates official canonical template file", async () => {
  const templatePath = getCanonicalTemplatePath();
  assert.ok(typeof templatePath === "string" && templatePath.length > 0);
  assert.strictEqual(fs.existsSync(templatePath), true);

  const stats = await fs.promises.stat(templatePath);
  assert.strictEqual(stats.size, CANONICAL_TEMPLATE_BYTE_SIZE);

  const metadata = await getTemplateMetadata();
  assert.strictEqual(metadata.tableCount, 3);
  assert.strictEqual(metadata.bodyParagraphCount, 13);
  assert.strictEqual(metadata.preallocatedItemRowCount, 6);
  assert.strictEqual(metadata.byteSize, CANONICAL_TEMPLATE_BYTE_SIZE);
  assert.strictEqual(metadata.sha256, CANONICAL_TEMPLATE_SHA256);
});

test("2. Template integrity: verifies canonical SHA-256 signature", async () => {
  const result = await verifyTemplateIntegrity();
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.actualHash, CANONICAL_TEMPLATE_SHA256);
  assert.strictEqual(result.expectedHash, CANONICAL_TEMPLATE_SHA256);

  // Directly load template buffer with integrity check enabled
  const buffer = await loadTemplateBuffer({ verifyIntegrity: true });
  assert.ok(buffer instanceof Buffer);
  assert.strictEqual(buffer.length, CANONICAL_TEMPLATE_BYTE_SIZE);
});

test("3. Template integrity: rejects corrupted or altered template buffers", async () => {
  const tempDir = path.resolve("scratch_test_dir");
  await fs.promises.mkdir(tempDir, { recursive: true });
  const fakeTemplatePath = path.join(tempDir, "fake_template.docx");

  try {
    await fs.promises.writeFile(fakeTemplatePath, Buffer.from("Corrupted content"));
    await assert.rejects(
      async () => {
        await loadTemplateBuffer({
          templatePath: fakeTemplatePath,
          verifyIntegrity: true,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof TemplateIntegrityError);
        assert.strictEqual(err.code, "TEMPLATE_INTEGRITY_MISMATCH");
        assert.strictEqual(err.expectedHash, CANONICAL_TEMPLATE_SHA256);
        return true;
      }
    );
  } finally {
    if (fs.existsSync(fakeTemplatePath)) {
      await fs.promises.unlink(fakeTemplatePath);
    }
    if (fs.existsSync(tempDir)) {
      await fs.promises.rmdir(tempDir);
    }
  }
});

test("4. Template error handling: non-existent template path throws TemplateNotFoundError", () => {
  assert.throws(
    () => {
      getCanonicalTemplatePath("non_existent_folder/missing_template.docx");
    },
    (err: unknown) => {
      assert.ok(err instanceof TemplateNotFoundError);
      assert.strictEqual(err.code, "TEMPLATE_NOT_FOUND");
      return true;
    }
  );
});

test("5. Document structure: parses expected 3 tables and expected table elements", async () => {
  const doc = await WorkingDocument.load();
  const tables = doc.getTables();
  assert.strictEqual(tables.length, 3, "Canonical template must contain exactly 3 tables");

  // Table 1 has 1 row
  const table1 = doc.getTable(0);
  assert.strictEqual(table1.getElementsByTagName("w:tr").length, 1);

  // Table 2 has 4 rows
  const table2 = doc.getTable(1);
  assert.strictEqual(table2.getElementsByTagName("w:tr").length, 4);

  // Table 3 has 8 rows (1 header + 6 item rows + 1 total row)
  const table3 = doc.getTable(2);
  assert.strictEqual(table3.getElementsByTagName("w:tr").length, 8);
});

test("6. Table 1 targeting: identifies Company Header and Date/QF# targets", async () => {
  const doc = await WorkingDocument.load();
  const targets = doc.getTargets();

  assert.ok(targets.table1.companyInfoCell);
  assert.ok(targets.table1.dateTextNode);
  assert.ok(targets.table1.qfNumberTextNode);

  assert.ok(targets.table1.dateTextNode.textContent?.includes("Date:"));
  assert.ok(
    targets.table1.qfNumberTextNode.textContent?.includes("QF#") ||
    targets.table1.qfNumberTextNode.textContent?.includes("QF #:")
  );

  // Target mutation in working document
  setDateAndQfNumber(targets.table1, "2026-10-04", "QF-20261004-0001");
  assert.ok(targets.table1.dateTextNode.textContent?.includes("2026-10-04"));
  assert.ok(targets.table1.qfNumberTextNode.textContent?.includes("QF-20261004-0001"));
});

test("7. Table 2 targeting: identifies Customer Name, Address, Contact Person, and Contact Number", async () => {
  const doc = await WorkingDocument.load();
  const targets = doc.getTargets();

  assert.ok(targets.table2.nameCell);
  assert.ok(targets.table2.addressCell);
  assert.ok(targets.table2.contactPersonCell);
  assert.ok(targets.table2.contactNumberCell);

  // Populating customer snapshot fields
  setCustomerField(targets.table2.nameCell, "Acme Construction Corp");
  setCustomerField(targets.table2.addressCell, "100 Industrial Road, Quezon City");
  setCustomerField(targets.table2.contactPersonCell, "Engr. Juan Dela Cruz");
  setCustomerField(targets.table2.contactNumberCell, "0917-555-0199");

  assert.strictEqual(getCellText(targets.table2.nameCell), "Acme Construction Corp");
  assert.strictEqual(getCellText(targets.table2.addressCell), "100 Industrial Road, Quezon City");
  assert.strictEqual(getCellText(targets.table2.contactPersonCell), "Engr. Juan Dela Cruz");
  assert.strictEqual(getCellText(targets.table2.contactNumberCell), "0917-555-0199");
});

test("8. Table 3 targeting: identifies item table, header, 6 preallocated rows, and repeatable prototype", async () => {
  const doc = await WorkingDocument.load();
  const targets = doc.getTargets();

  assert.ok(targets.table3.tableElement);
  assert.ok(targets.table3.headerRow);
  assert.strictEqual(targets.table3.itemRows.length, 6, "Expected 6 preallocated item rows");

  // Verify header row contains all 7 expected column titles
  const headerTexts = ["Item #", "Item Description", "Brand", "Unit of Measure", "Unit Price", "Quantity", "Total"];
  const headerCells = targets.table3.headerRow.getElementsByTagName("w:tc");
  assert.strictEqual(headerCells.length, 7);
  for (let i = 0; i < 7; i++) {
    assert.strictEqual(getCellText(headerCells[i]), headerTexts[i]);
  }

  // Verify prototype row (Row 2, index 1)
  const prototype = targets.table3.prototype;
  assert.strictEqual(prototype.columnCount, 7);
  assert.deepStrictEqual(prototype.columnWidthsDxa, ITEM_TABLE_COLUMN_WIDTHS_DXA);

  // Test prototype cloning capability for Phase 13
  const clonedRow = prototype.clone();
  assert.ok(clonedRow);
  assert.strictEqual(clonedRow.nodeName, "w:tr");
  const clonedCells = clonedRow.getElementsByTagName("w:tc");
  assert.strictEqual(clonedCells.length, 7);
  // Verify cloned row is independent
  assert.notStrictEqual(clonedRow, prototype.element);

  // Test populating a preallocated item row
  const firstItemRow = targets.table3.itemRows[0];
  populateItemRow(firstItemRow, {
    itemNumber: 1,
    description: "Heavy Duty Anchor Bolt M16 x 150mm",
    brand: "Hilti",
    uom: "pc",
    unitPrice: "₱ 185.00",
    quantity: "50",
    total: "₱ 9,250.00",
  });

  assert.strictEqual(getCellText(firstItemRow.itemNumberCell), "1");
  assert.strictEqual(getCellText(firstItemRow.descriptionCell), "Heavy Duty Anchor Bolt M16 x 150mm");
  assert.strictEqual(getCellText(firstItemRow.brandCell), "Hilti");
  assert.strictEqual(getCellText(firstItemRow.uomCell), "pc");
  assert.strictEqual(getCellText(firstItemRow.unitPriceCell), "₱ 185.00");
  assert.strictEqual(getCellText(firstItemRow.quantityCell), "50");
  assert.strictEqual(getCellText(firstItemRow.totalCell), "₱ 9,250.00");
});

test("9. Table 4 targeting: identifies Total Amount row and Grand Total insertion cell", async () => {
  const doc = await WorkingDocument.load();
  const targets = doc.getTargets();

  assert.ok(targets.table4.tableElement);
  assert.ok(targets.table4.rowElement);
  assert.ok(targets.table4.labelCell);
  assert.ok(targets.table4.quantitySpacerCell);
  assert.ok(targets.table4.grandTotalCell);

  assert.strictEqual(getCellText(targets.table4.labelCell), "Total Amount:");

  // Inject grand total
  setGrandTotal(targets.table4.grandTotalCell, "₱ 9,250.00");
  assert.strictEqual(getCellText(targets.table4.grandTotalCell), "₱ 9,250.00");
});

test("10. Immutability safeguard: strictly blocks writing to canonical template", async () => {
  const canonicalPath = getCanonicalTemplatePath();

  // Test direct assertion function
  assert.throws(
    () => {
      assertNotCanonicalTemplate(canonicalPath);
    },
    (err: unknown) => {
      assert.ok(err instanceof TemplateImmutabilityError);
      assert.strictEqual(err.code, "TEMPLATE_IMMUTABILITY_VIOLATION");
      return true;
    }
  );

  // Test WorkingDocument.saveToFile safeguard
  const doc = await WorkingDocument.load();
  await assert.rejects(
    async () => {
      await doc.saveToFile(canonicalPath);
    },
    (err: unknown) => {
      assert.ok(err instanceof TemplateImmutabilityError);
      assert.strictEqual(err.code, "TEMPLATE_IMMUTABILITY_VIOLATION");
      return true;
    }
  );
});

test("11. Formatting preservation: generated working document remains structurally valid and preserves styles", async () => {
  const doc = await WorkingDocument.load();
  const targets = doc.getTargets();

  // Apply sample values across all targets
  setDateAndQfNumber(targets.table1, "2026-10-04", "QF-20261004-0001");
  setCustomerField(targets.table2.nameCell, "JJ Client Verification");
  populateItemRow(targets.table3.itemRows[0], {
    itemNumber: 1,
    description: "Test Material",
    brand: "Generic",
    uom: "unit",
    unitPrice: "₱ 500.00",
    quantity: "2",
    total: "₱ 1,000.00",
  });
  setGrandTotal(targets.table4.grandTotalCell, "₱ 1,000.00");

  // Export to buffer
  const modifiedBuffer = await doc.saveToBuffer();
  assert.ok(modifiedBuffer instanceof Buffer);
  assert.ok(modifiedBuffer.length > 0);

  // Reload the generated buffer as a working document
  const reloaded = await WorkingDocument.load(modifiedBuffer, { verifyIntegrity: false });
  assert.strictEqual(reloaded.getTables().length, 3);

  const reloadedTargets = reloaded.getTargets();
  assert.strictEqual(getCellText(reloadedTargets.table2.nameCell), "JJ Client Verification");
  assert.strictEqual(getCellText(reloadedTargets.table3.itemRows[0].descriptionCell), "Test Material");
  assert.strictEqual(getCellText(reloadedTargets.table4.grandTotalCell), "₱ 1,000.00");
});

test("12. Immutability verification: canonical template SHA-256 remains strictly unchanged after all operations", async () => {
  const canonicalPath = getCanonicalTemplatePath();
  const currentHash = await computeFileSha256(canonicalPath);
  assert.strictEqual(
    currentHash,
    CANONICAL_TEMPLATE_SHA256,
    "CRITICAL: The canonical template file on disk must never be modified!"
  );
});

/* =========================================================================
 * PHASE 13 — DYNAMIC DOCX ROW GENERATION TESTS
 * ========================================================================= */

test("13. Dynamic row generation: native item counts (1, 2, 3, 4, 5, 6) produce exact row counts", async () => {
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const doc = await WorkingDocument.load();
    const targets = doc.prepareItemRows(count);

    assert.strictEqual(targets.length, count, `Expected ${count} item targets`);
    assert.strictEqual(doc.getItemRows().length, count, `Expected ${count} item rows in getter`);

    const table3 = doc.getTable(2);
    const t3Rows = getChildElements(table3, "w:tr");
    // Table 3 has 1 header row + `count` item rows + 1 total row (if merged into Table 3)
    const expectedT3Rows = doc.getTables().length >= 4 ? count + 1 : count + 2;
    assert.strictEqual(
      t3Rows.length,
      expectedT3Rows,
      `Table 3 should contain exactly ${expectedT3Rows} rows`
    );

    assert.strictEqual(doc.isTotalRowLast(), true, "Total row must remain last");
  }
});

test("14. Dynamic row generation: expanded item counts (7, 8, 10, 20, 50) produce exact row counts", async () => {
  for (const count of [7, 8, 10, 20, 50]) {
    const doc = await WorkingDocument.load();
    const targets = doc.prepareItemRows(count);

    assert.strictEqual(targets.length, count, `Expected ${count} item targets`);
    assert.strictEqual(doc.getItemRows().length, count, `Expected ${count} item rows in getter`);

    const table3 = doc.getTable(2);
    const t3Rows = getChildElements(table3, "w:tr");
    const expectedT3Rows = doc.getTables().length >= 4 ? count + 1 : count + 2;
    assert.strictEqual(
      t3Rows.length,
      expectedT3Rows,
      `Table 3 should contain exactly ${expectedT3Rows} rows`
    );

    assert.strictEqual(doc.isTotalRowLast(), true, "Total row must remain last");
  }
});

test("15. Table structure verification: Header is first, Item rows are middle, Total row is strictly last", async () => {
  for (const count of [1, 2, 6, 7, 20, 50]) {
    const doc = await WorkingDocument.load();
    doc.prepareItemRows(count);

    const headerRow = doc.getHeaderRow();
    const itemRows = doc.getItemRows();
    const totalRow = doc.getTotalRow();
    const compoundRows = doc.getQuotationTableRows();

    // Verify order
    assert.strictEqual(compoundRows.length, count + 2, "Expected header + items + total");
    assert.strictEqual(compoundRows[0], headerRow, "Header row must be first");
    for (let i = 0; i < count; i++) {
      assert.strictEqual(compoundRows[i + 1], itemRows[i].rowElement, `Item row ${i + 1} in order`);
    }
    assert.strictEqual(compoundRows[compoundRows.length - 1], totalRow, "Total row must be last");
    assert.strictEqual(doc.isTotalRowLast(), true, "isTotalRowLast must return true");

    // Header cells verification
    const headerCells = getChildElements(headerRow, "w:tc");
    assert.strictEqual(headerCells.length, 7);
    assert.strictEqual(getCellText(headerCells[0]), "Item #");
    assert.strictEqual(getCellText(headerCells[6]), "Total");

    // Total row cells verification
    const totalCells = getChildElements(totalRow, "w:tc");
    assert.ok(totalCells.length >= 2, "Total row must contain at least 2 cells (label and total)");
    assert.strictEqual(getCellText(totalCells[0]), "Total Amount:");
  }
});

test("16. Column count and width preservation: every generated row has exactly 7 cells with canonical widths", async () => {
  const doc = await WorkingDocument.load();
  const count = 20;
  const rows = doc.prepareItemRows(count);

  for (let r = 0; r < rows.length; r++) {
    const rowEl = rows[r].rowElement;
    const cells = getChildElements(rowEl, "w:tc");
    assert.strictEqual(cells.length, 7, `Row ${r + 1} must have exactly 7 cells`);

    for (let c = 0; c < 7; c++) {
      const tcW = cells[c].getElementsByTagName("w:tcW")[0];
      assert.ok(tcW, `Cell ${c + 1} must have <w:tcW>`);
      const width = Number(tcW.getAttribute("w:w"));
      assert.strictEqual(
        width,
        ITEM_TABLE_COLUMN_WIDTHS_DXA[c],
        `Row ${r + 1} column ${c + 1} width must match canonical ${ITEM_TABLE_COLUMN_WIDTHS_DXA[c]} dxa`
      );
    }
  }
});

test("17. Prototype formatting preservation: cloned rows retain borders, margins, spacing, and clean text", async () => {
  const doc = await WorkingDocument.load();
  const prototypeTarget = doc.getItemRowPrototype();
  const protoElement = prototypeTarget.element;
  const protoCells = getChildElements(protoElement, "w:tc");

  const rows = doc.prepareItemRows(10);
  // Row 7 (index 6) is a dynamically cloned row beyond the native 6
  const clonedRowTarget = rows[6];
  const clonedCells = getChildElements(clonedRowTarget.rowElement, "w:tc");

  assert.strictEqual(clonedCells.length, 7);

  for (let c = 0; c < 7; c++) {
    const protoTcPr = protoCells[c].getElementsByTagName("w:tcPr")[0];
    const clonedTcPr = clonedCells[c].getElementsByTagName("w:tcPr")[0];

    // Borders match
    const protoBorders = protoTcPr.getElementsByTagName("w:tcBorders")[0];
    const clonedBorders = clonedTcPr.getElementsByTagName("w:tcBorders")[0];
    assert.strictEqual(
      clonedBorders ? "yes" : "no",
      protoBorders ? "yes" : "no",
      `Cell ${c} borders presence must match`
    );

    // Margins match
    const protoMar = protoTcPr.getElementsByTagName("w:tcMar")[0];
    const clonedMar = clonedTcPr.getElementsByTagName("w:tcMar")[0];
    assert.strictEqual(
      clonedMar ? "yes" : "no",
      protoMar ? "yes" : "no",
      `Cell ${c} margins presence must match`
    );

    // Paragraph spacing matches
    const protoSpacing = protoCells[c].getElementsByTagName("w:spacing")[0];
    const clonedSpacing = clonedCells[c].getElementsByTagName("w:spacing")[0];
    assert.strictEqual(
      clonedSpacing.getAttribute("w:before"),
      protoSpacing.getAttribute("w:before")
    );
    assert.strictEqual(
      clonedSpacing.getAttribute("w:after"),
      protoSpacing.getAttribute("w:after")
    );

    // Verify cell content is clean (no stale values, ready for Phase 14)
    assert.strictEqual(
      getCellText(clonedCells[c]),
      "",
      `Cell ${c + 1} of newly cloned row must be empty and ready for data`
    );
  }
});

test("18. No duplication: only 1 header row and 1 total row exist across all row counts", async () => {
  for (const count of [1, 5, 6, 7, 25]) {
    const doc = await WorkingDocument.load();
    doc.prepareItemRows(count);

    const table3 = doc.getTable(2);

    // Check header row: exactly 1 in Table 3
    const t3Rows = getChildElements(table3, "w:tr");
    let headerCount = 0;
    let totalCount = 0;
    for (const r of t3Rows) {
      const cells = getChildElements(r, "w:tc");
      if (cells.length > 0 && getCellText(cells[0]) === "Item #") {
        headerCount++;
      }
      if (cells.length > 0 && getCellText(cells[0]) === "Total Amount:") {
        totalCount++;
      }
    }
    assert.strictEqual(headerCount, 1, `Expected exactly 1 header row for count ${count}`);
    assert.strictEqual(totalCount, 1, `Expected exactly 1 total row for count ${count}`);
    assert.strictEqual(doc.isTotalRowLast(), true);
  }
});

test("19. Rejection of invalid item counts: rejects non-positive, decimal, and non-integer inputs", async () => {
  const doc = await WorkingDocument.load();

  const invalidInputs: unknown[] = [
    0,
    -1,
    -100,
    1.5,
    3.14159,
    NaN,
    Infinity,
    -Infinity,
    "5",
    "abc",
    null,
    undefined,
    {},
    [],
    true,
  ];

  for (const invalid of invalidInputs) {
    assert.throws(
      () => {
        doc.prepareItemRows(invalid as number);
      },
      (err: unknown) => {
        assert.ok(
          err instanceof ValidationError,
          `Input ${String(invalid)} should throw ValidationError`
        );
        assert.ok(
          err instanceof DocumentItemCountError,
          `Input ${String(invalid)} should throw DocumentItemCountError`
        );
        return true;
      },
      `Should reject invalid item count: ${String(invalid)}`
    );
  }
});

test("20. Repeated invocation and reconfiguration: idempotent and safely supports re-generation", async () => {
  const doc = await WorkingDocument.load();

  // 1. Prepare 20 rows
  const rows20 = doc.prepareItemRows(20);
  assert.strictEqual(rows20.length, 20);
  assert.strictEqual(doc.getItemRows().length, 20);

  // 2. Prepare 20 rows again (idempotent, must not duplicate to 40)
  const rows20Again = doc.prepareItemRows(20);
  assert.strictEqual(rows20Again.length, 20, "Repeated prepare(20) must remain 20 rows");
  assert.strictEqual(doc.getTable(2).getElementsByTagName("w:tr").length, 22);

  // 3. Reconfigure to 5 rows (shrinks)
  const rows5 = doc.prepareItemRows(5);
  assert.strictEqual(rows5.length, 5, "Reconfigured prepare(5) must shrink to 5 rows");
  assert.strictEqual(doc.getTable(2).getElementsByTagName("w:tr").length, 7);
  assert.strictEqual(doc.isTotalRowLast(), true);

  // 4. Reconfigure to 7 rows (expands)
  const rows7 = doc.prepareItemRows(7);
  assert.strictEqual(rows7.length, 7, "Reconfigured prepare(7) must expand to 7 rows");
  assert.strictEqual(doc.getTable(2).getElementsByTagName("w:tr").length, 9);
  assert.strictEqual(doc.isTotalRowLast(), true);
});

test("21. Stress test: safely handles 50 and 100 item rows with complete structural integrity", async () => {
  // Test 50 rows
  const doc50 = await WorkingDocument.load();
  const rows50 = doc50.prepareItemRows(50);
  assert.strictEqual(rows50.length, 50);
  assert.strictEqual(doc50.getTable(2).getElementsByTagName("w:tr").length, 52);
  assert.strictEqual(doc50.isTotalRowLast(), true);

  const buffer50 = await doc50.saveToBuffer();
  assert.ok(buffer50.length > 0);
  const reloaded50 = await WorkingDocument.load(buffer50);
  assert.strictEqual(reloaded50.getItemRows().length, 50);
  assert.strictEqual(reloaded50.isTotalRowLast(), true);

  // Test 100 rows
  const doc100 = await WorkingDocument.load();
  const rows100 = doc100.prepareItemRows(100);
  assert.strictEqual(rows100.length, 100);
  assert.strictEqual(doc100.getTable(2).getElementsByTagName("w:tr").length, 102);
  assert.strictEqual(doc100.isTotalRowLast(), true);

  const buffer100 = await doc100.saveToBuffer();
  assert.ok(buffer100.length > 0);
  const reloaded100 = await WorkingDocument.load(buffer100);
  assert.strictEqual(reloaded100.getItemRows().length, 100);
  assert.strictEqual(reloaded100.isTotalRowLast(), true);
});

test("22. Serialization and reload test: dynamic table preserves values, rows, and structure after full roundtrip", async () => {
  const doc = await WorkingDocument.load();
  const count = 20;
  const rows = doc.prepareItemRows(count);

  // Populate row 1
  populateItemRow(rows[0], {
    itemNumber: 1,
    description: "Premium Portland Cement Type 1",
    brand: "Holcim",
    uom: "bag",
    unitPrice: "₱ 260.00",
    quantity: "100",
    total: "₱ 26,000.00",
  });

  // Populate row 20
  populateItemRow(rows[19], {
    itemNumber: 20,
    description: "Deformed Steel Bar 16mm x 6m Grade 40",
    brand: "SteelAsia",
    uom: "length",
    unitPrice: "₱ 430.00",
    quantity: "50",
    total: "₱ 21,500.00",
  });

  // Set grand total
  setGrandTotal(doc.getTargets().table4.grandTotalCell, "₱ 47,500.00");

  // Save to buffer
  const buffer = await doc.saveToBuffer();
  assert.ok(buffer instanceof Buffer);

  // Reload from buffer
  const reloaded = await WorkingDocument.load(buffer);
  assert.strictEqual(reloaded.getTables().length, 3);

  const reloadedTargets = reloaded.getTargets();
  const reloadedItemRows = reloadedTargets.table3.itemRows;
  assert.strictEqual(reloadedItemRows.length, 20);

  // Verify row 1 populated data survived
  assert.strictEqual(getCellText(reloadedItemRows[0].itemNumberCell), "1");
  assert.strictEqual(getCellText(reloadedItemRows[0].descriptionCell), "Premium Portland Cement Type 1");
  assert.strictEqual(getCellText(reloadedItemRows[0].brandCell), "Holcim");
  assert.strictEqual(getCellText(reloadedItemRows[0].uomCell), "bag");
  assert.strictEqual(getCellText(reloadedItemRows[0].unitPriceCell), "₱ 260.00");
  assert.strictEqual(getCellText(reloadedItemRows[0].quantityCell), "100");
  assert.strictEqual(getCellText(reloadedItemRows[0].totalCell), "₱ 26,000.00");

  // Verify row 20 populated data survived
  assert.strictEqual(getCellText(reloadedItemRows[19].itemNumberCell), "20");
  assert.strictEqual(getCellText(reloadedItemRows[19].descriptionCell), "Deformed Steel Bar 16mm x 6m Grade 40");
  assert.strictEqual(getCellText(reloadedItemRows[19].brandCell), "SteelAsia");
  assert.strictEqual(getCellText(reloadedItemRows[19].uomCell), "length");
  assert.strictEqual(getCellText(reloadedItemRows[19].unitPriceCell), "₱ 430.00");
  assert.strictEqual(getCellText(reloadedItemRows[19].quantityCell), "50");
  assert.strictEqual(getCellText(reloadedItemRows[19].totalCell), "₱ 21,500.00");

  // Verify grand total survived
  assert.strictEqual(getCellText(reloadedTargets.table4.grandTotalCell), "₱ 47,500.00");

  // Verify total row is last
  assert.strictEqual(reloaded.isTotalRowLast(), true);
});

test("23. Standalone functional helpers: validateItemCount, createCleanItemRowClone, prepareItemRows, generateItemRows, and validateQuotationDocumentStructure", async () => {
  // 1. validateItemCount
  assert.doesNotThrow(() => validateItemCount(1));
  assert.doesNotThrow(() => validateItemCount(50));
  assert.throws(() => validateItemCount(0), (err: unknown) => err instanceof DocumentItemCountError);

  // 2. createCleanItemRowClone
  const doc = await WorkingDocument.load();
  const proto = doc.getItemRowPrototype().element;
  const clone = createCleanItemRowClone(proto);
  assert.strictEqual(clone.nodeName, "w:tr");
  const cloneCells = getChildElements(clone, "w:tc");
  assert.strictEqual(cloneCells.length, 7);
  for (const c of cloneCells) {
    assert.strictEqual(getCellText(c), "");
  }

  // 3. prepareItemRows and generateItemRows on standalone DOM
  const targets = prepareItemRows(doc.getDom(), 3);
  assert.strictEqual(targets.length, 3);
  const targetsGen = generateItemRows(doc.getDom(), 4);
  assert.strictEqual(targetsGen.length, 4);

  // 4. validateQuotationDocumentStructure
  assert.doesNotThrow(() => validateQuotationDocumentStructure(doc.getDom()));

  // 5. Structure error throwing on malformed document
  const dom = doc.getDom();
  const body = dom.getElementsByTagName("w:body")[0];
  const tables = getChildElements(body, "w:tbl");
  // Temporarily remove last table to test error detection
  const removedTable = tables[tables.length - 1];
  body.removeChild(removedTable);
  assert.throws(
    () => validateQuotationDocumentStructure(dom),
    (err: unknown) => err instanceof DocumentStructureError
  );
  // Restore table
  body.appendChild(removedTable);
});

test("24. Canonical template immutability: SHA-256 strictly matches canonical constant", async () => {
  const canonicalPath = getCanonicalTemplatePath();
  const currentHash = await computeFileSha256(canonicalPath);
  assert.strictEqual(
    currentHash,
    CANONICAL_TEMPLATE_SHA256,
    "CRITICAL: The canonical template file on disk must never be modified!"
  );
});


