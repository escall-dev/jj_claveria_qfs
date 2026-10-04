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
} from "../lib/documents/index.ts";
import {
  TemplateNotFoundError,
  TemplateIntegrityError,
  TemplateImmutabilityError,
} from "../lib/errors.ts";

test("1. Template existence: locates official canonical template file", async () => {
  const templatePath = getCanonicalTemplatePath();
  assert.ok(typeof templatePath === "string" && templatePath.length > 0);
  assert.strictEqual(fs.existsSync(templatePath), true);

  const stats = await fs.promises.stat(templatePath);
  assert.strictEqual(stats.size, CANONICAL_TEMPLATE_BYTE_SIZE);

  const metadata = await getTemplateMetadata();
  assert.strictEqual(metadata.tableCount, 4);
  assert.strictEqual(metadata.bodyParagraphCount, 10);
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

test("5. Document structure: parses exactly 4 tables and expected table elements", async () => {
  const doc = await WorkingDocument.load();
  const tables = doc.getTables();
  assert.strictEqual(tables.length, 4, "Canonical template must contain exactly 4 tables");

  // Table 1 has 1 row
  const table1 = doc.getTable(0);
  assert.strictEqual(table1.getElementsByTagName("w:tr").length, 1);

  // Table 2 has 4 rows
  const table2 = doc.getTable(1);
  assert.strictEqual(table2.getElementsByTagName("w:tr").length, 4);

  // Table 3 has 7 rows (1 header + 6 item rows)
  const table3 = doc.getTable(2);
  assert.strictEqual(table3.getElementsByTagName("w:tr").length, 7);

  // Table 4 has 1 row
  const table4 = doc.getTable(3);
  assert.strictEqual(table4.getElementsByTagName("w:tr").length, 1);
});

test("6. Table 1 targeting: identifies Company Header and Date/QF# targets", async () => {
  const doc = await WorkingDocument.load();
  const targets = doc.getTargets();

  assert.ok(targets.table1.companyInfoCell);
  assert.ok(targets.table1.metaInfoCell);
  assert.ok(targets.table1.dateTextNode);
  assert.ok(targets.table1.qfNumberTextNode);

  assert.ok(targets.table1.dateTextNode.textContent?.includes("Date:"));
  assert.ok(targets.table1.qfNumberTextNode.textContent?.includes("QF #:"));

  // Target mutation in working document
  setDateAndQfNumber(targets.table1, "2026-10-04", "QF-20261004-0001");
  assert.strictEqual(targets.table1.dateTextNode.textContent, "Date: 2026-10-04");
  assert.strictEqual(targets.table1.qfNumberTextNode.textContent, "QF #: QF-20261004-0001");
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
  assert.strictEqual(reloaded.getTables().length, 4);

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
