import type { Document, Element, Node } from "@xmldom/xmldom";
import { DocumentStructureError, DocumentItemCountError } from "../errors.ts";
import type {
  DocumentTargetMap,
  Table1HeaderTarget,
  Table2CustomerTargets,
  Table3ItemRowTarget,
  Table3QuotationItemTargets,
  Table4GrandTotalTarget,
  ItemRowPrototype,
  QuotationDocumentItemInput,
} from "./types.ts";

/**
 * Standard column widths in dxa for the 7-column Quotation Item Table (Table 3).
 * Sum = 10,080 dxa (7.00 inches at 1440 dxa/inch).
 */
export const ITEM_TABLE_COLUMN_WIDTHS_DXA = [
  864,  // 1. Item # (~0.60 in)
  3168, // 2. Item Description (~2.20 in)
  1296, // 3. Brand (~0.90 in)
  1440, // 4. Unit of Measure (~1.00 in)
  1152, // 5. Unit Price (~0.80 in)
  1008, // 6. Quantity (~0.70 in)
  1152, // 7. Total (~0.80 in)
] as const;

/**
 * Helper to get direct child elements of a given tag name.
 */
export function getChildElements(parent: Node, tagName?: string): Element[] {
  const result: Element[] = [];
  const children = parent.childNodes;
  if (!children) return result;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.nodeType === 1 /* ELEMENT_NODE */) {
      if (!tagName || node.nodeName === tagName) {
        result.push(node as Element);
      }
    }
  }
  return result;
}

/**
 * Extracts combined text from all <w:t> nodes within an element.
 */
export function getCellText(cell: Element): string {
  const tNodes = cell.getElementsByTagName("w:t");
  let text = "";
  for (let i = 0; i < tNodes.length; i++) {
    text += tNodes[i].textContent || "";
  }
  return text.trim();
}

/**
 * Extracts Table 1 targets: Company/Store Header and Date / QF Number area.
 */
export function extractTable1Targets(table: Element): Table1HeaderTarget {
  const rows = getChildElements(table, "w:tr");
  if (rows.length < 1) {
    throw new DocumentStructureError("Table 1 (Header) is missing the primary row");
  }

  const cells = getChildElements(rows[0], "w:tc");
  if (cells.length < 2) {
    throw new DocumentStructureError("Table 1 (Header) must contain at least 2 cells");
  }

  const companyInfoCell = cells[0];
  const metaInfoCell = cells[1];

  let dateTextNode: Node | null = null;
  let qfNumberTextNode: Node | null = null;

  const tNodes = metaInfoCell.getElementsByTagName("w:t");
  for (let i = 0; i < tNodes.length; i++) {
    const text = tNodes[i].textContent || "";
    if (text.includes("Date:")) {
      dateTextNode = tNodes[i];
    } else if (text.includes("QF #:") || text.includes("QF:")) {
      qfNumberTextNode = tNodes[i];
    }
  }

  return {
    companyInfoCell,
    metaInfoCell,
    dateTextNode,
    qfNumberTextNode,
  };
}

/**
 * Extracts Table 2 targets: Customer snapshot fields (Name, Address, Contact Person, Contact Number).
 */
export function extractTable2Targets(table: Element): Table2CustomerTargets {
  const rows = getChildElements(table, "w:tr");
  if (rows.length < 4) {
    throw new DocumentStructureError(
      `Table 2 (Customer) expects 4 rows (Name, Address, Contact Person, Contact Number), found ${rows.length}`
    );
  }

  const getTargetCell = (rowIndex: number, fieldName: string): Element => {
    const cells = getChildElements(rows[rowIndex], "w:tc");
    if (cells.length < 2) {
      throw new DocumentStructureError(
        `Table 2 Row ${rowIndex + 1} (${fieldName}) must contain 2 cells`
      );
    }
    return cells[1];
  };

  return {
    nameCell: getTargetCell(0, "Name"),
    addressCell: getTargetCell(1, "Address"),
    contactPersonCell: getTargetCell(2, "Contact Person"),
    contactNumberCell: getTargetCell(3, "Contact Number"),
  };
}

/**
 * Extracts Table 3 targets: Quotation Items table, header row, preallocated item rows, and row prototype.
 */
export function extractTable3Targets(table: Element): Table3QuotationItemTargets {
  const rows = getChildElements(table, "w:tr");
  if (rows.length < 2) {
    throw new DocumentStructureError(
      `Table 3 (Items) must have at least 1 header row and 1 item prototype row, found ${rows.length}`
    );
  }

  const headerRow = rows[0];
  const headerCells = getChildElements(headerRow, "w:tc");
  if (headerCells.length !== 7) {
    throw new DocumentStructureError(
      `Table 3 header row must contain 7 columns, found ${headerCells.length}`
    );
  }

  // Preallocated item rows are rows 1 to 6 (if present)
  const itemRows: Table3ItemRowTarget[] = [];
  for (let r = 1; r < rows.length; r++) {
    const rowEl = rows[r];
    const cells = getChildElements(rowEl, "w:tc");
    if (cells.length >= 7) {
      itemRows.push({
        rowIndex: r,
        rowElement: rowEl,
        itemNumberCell: cells[0],
        descriptionCell: cells[1],
        brandCell: cells[2],
        uomCell: cells[3],
        unitPriceCell: cells[4],
        quantityCell: cells[5],
        totalCell: cells[6],
      });
    }
  }

  // Row 1 (the 2nd row in the table) is the official designated prototype
  const prototypeElement = rows[1];
  const prototype: ItemRowPrototype = {
    element: prototypeElement,
    columnWidthsDxa: ITEM_TABLE_COLUMN_WIDTHS_DXA,
    columnCount: 7,
    clone(): Element {
      return createCleanItemRowClone(prototypeElement);
    },
  };

  return {
    tableElement: table,
    headerRow,
    itemRows,
    prototype,
  };
}

/**
 * Extracts Table 4 targets: Grand total insertion area.
 */
export function extractTable4Targets(table: Element): Table4GrandTotalTarget {
  const rows = getChildElements(table, "w:tr");
  if (rows.length < 1) {
    throw new DocumentStructureError("Table 4 (Total) must contain at least 1 row");
  }

  const row = rows[0];
  const cells = getChildElements(row, "w:tc");
  if (cells.length < 3) {
    throw new DocumentStructureError(
      `Table 4 (Total) row must contain 3 cells (Label, Quantity Spacer, Grand Total), found ${cells.length}`
    );
  }

  return {
    tableElement: table,
    rowElement: row,
    labelCell: cells[0],
    quantitySpacerCell: cells[1],
    grandTotalCell: cells[2],
  };
}

/**
 * Maps all structural targets from the 4 canonical tables of the official template.
 */
export function extractDocumentTargets(dom: Document): DocumentTargetMap {
  const body = dom.getElementsByTagName("w:body")[0];
  if (!body) {
    throw new DocumentStructureError("Document is missing <w:body> element");
  }

  const tables = getChildElements(body, "w:tbl");
  if (tables.length < 4) {
    throw new DocumentStructureError(
      `Canonical template requires 4 tables, found ${tables.length}`
    );
  }

  return {
    table1: extractTable1Targets(tables[0]),
    table2: extractTable2Targets(tables[1]),
    table3: extractTable3Targets(tables[2]),
    table4: extractTable4Targets(tables[3]),
  };
}

/**
 * Updates the Date and QF Number in Table 1, Row 1, Cell 2.
 */
export function setDateAndQfNumber(
  targets: Table1HeaderTarget,
  date: string,
  qfNumber: string
): void {
  if (targets.dateTextNode) {
    targets.dateTextNode.textContent = `Date: ${date}`;
  }
  if (targets.qfNumberTextNode) {
    targets.qfNumberTextNode.textContent = `QF #: ${qfNumber}`;
  }
}

/**
 * Sets a customer snapshot field in Table 2, preserving the run formatting (Arial 19 half-points).
 */
export function setCustomerField(cell: Element, value: string): void {
  const tNodes = cell.getElementsByTagName("w:t");
  if (tNodes.length > 0) {
    tNodes[0].textContent = value;
    // Clear any extra text nodes inside this run/paragraph
    for (let i = 1; i < tNodes.length; i++) {
      tNodes[i].textContent = "";
    }
  } else {
    // If no <w:t> exists, create a properly formatted run
    const doc = cell.ownerDocument;
    if (!doc) {
      throw new DocumentStructureError("Cell element is missing ownerDocument");
    }
    const p = doc.createElement("w:p");
    const pPr = doc.createElement("w:pPr");
    const spacing = doc.createElement("w:spacing");
    spacing.setAttribute("w:before", "40");
    spacing.setAttribute("w:after", "40");
    pPr.appendChild(spacing);
    p.appendChild(pPr);

    const r = doc.createElement("w:r");
    const rPr = doc.createElement("w:rPr");
    const rFonts = doc.createElement("w:rFonts");
    rFonts.setAttribute("w:ascii", "Arial");
    rFonts.setAttribute("w:hAnsi", "Arial");
    const sz = doc.createElement("w:sz");
    sz.setAttribute("w:val", "19");
    rPr.appendChild(rFonts);
    rPr.appendChild(sz);
    r.appendChild(rPr);

    const t = doc.createElement("w:t");
    t.textContent = value;
    r.appendChild(t);
    p.appendChild(r);

    cell.appendChild(p);
  }
}

/**
 * Safely inserts or updates the Grand Total in Table 4 Cell 3.
 */
export function setGrandTotal(cell: Element, amountFormatted: string): void {
  const doc = cell.ownerDocument;
  if (!doc) {
    throw new DocumentStructureError("Cell element is missing ownerDocument");
  }
  const tNodes = cell.getElementsByTagName("w:t");

  if (tNodes.length > 0) {
    tNodes[0].textContent = amountFormatted;
    for (let i = 1; i < tNodes.length; i++) {
      tNodes[i].textContent = "";
    }
    return;
  }

  // The template has an empty <w:p/> in Table 4 Cell 3.
  // Find or create the paragraph:
  let p = cell.getElementsByTagName("w:p")[0];
  if (!p) {
    p = doc.createElement("w:p");
    cell.appendChild(p);
  }

  // Ensure right alignment and spacing matching the total row
  let pPr = p.getElementsByTagName("w:pPr")[0];
  if (!pPr) {
    pPr = doc.createElement("w:pPr");
    p.insertBefore(pPr, p.firstChild);
  }
  const jc = doc.createElement("w:jc");
  jc.setAttribute("w:val", "right");
  pPr.appendChild(jc);

  const spacing = doc.createElement("w:spacing");
  spacing.setAttribute("w:before", "80");
  spacing.setAttribute("w:after", "80");
  pPr.appendChild(spacing);

  const r = doc.createElement("w:r");
  const rPr = doc.createElement("w:rPr");
  const rFonts = doc.createElement("w:rFonts");
  rFonts.setAttribute("w:ascii", "Arial");
  rFonts.setAttribute("w:hAnsi", "Arial");
  const b = doc.createElement("w:b");
  const sz = doc.createElement("w:sz");
  sz.setAttribute("w:val", "19");

  rPr.appendChild(rFonts);
  rPr.appendChild(b);
  rPr.appendChild(sz);
  r.appendChild(rPr);

  const t = doc.createElement("w:t");
  t.textContent = amountFormatted;
  r.appendChild(t);

  p.appendChild(r);
}

/**
 * Sets values for a specific preallocated Table 3 item row target.
 */
export function populateItemRow(
  rowTarget: Table3ItemRowTarget,
  item: QuotationDocumentItemInput
): void {
  const setCellFormattedText = (
    cell: Element,
    text: string,
    align: "left" | "center" | "right" = "left",
    bold = false
  ) => {
    const doc = cell.ownerDocument;
    if (!doc) {
      throw new DocumentStructureError("Cell element is missing ownerDocument");
    }
    const tNodes = cell.getElementsByTagName("w:t");
    if (tNodes.length > 0) {
      tNodes[0].textContent = text;
      for (let i = 1; i < tNodes.length; i++) {
        tNodes[i].textContent = "";
      }
      return;
    }

    let p = cell.getElementsByTagName("w:p")[0];
    if (!p) {
      p = doc.createElement("w:p");
      cell.appendChild(p);
    }

    let pPr = p.getElementsByTagName("w:pPr")[0];
    if (!pPr) {
      pPr = doc.createElement("w:pPr");
      p.insertBefore(pPr, p.firstChild);
    }

    const jc = doc.createElement("w:jc");
    jc.setAttribute("w:val", align);
    pPr.appendChild(jc);

    const r = doc.createElement("w:r");
    const rPr = doc.createElement("w:rPr");
    const rFonts = doc.createElement("w:rFonts");
    rFonts.setAttribute("w:ascii", "Arial");
    rFonts.setAttribute("w:hAnsi", "Arial");
    const sz = doc.createElement("w:sz");
    sz.setAttribute("w:val", "18");

    rPr.appendChild(rFonts);
    if (bold) {
      rPr.appendChild(doc.createElement("w:b"));
    }
    rPr.appendChild(sz);
    r.appendChild(rPr);

    const t = doc.createElement("w:t");
    t.textContent = text;
    r.appendChild(t);

    p.appendChild(r);
  };

  setCellFormattedText(rowTarget.itemNumberCell, String(item.itemNumber), "center");
  setCellFormattedText(rowTarget.descriptionCell, item.description, "left");
  setCellFormattedText(rowTarget.brandCell, item.brand, "left");
  setCellFormattedText(rowTarget.uomCell, item.uom, "center");
  setCellFormattedText(rowTarget.unitPriceCell, item.unitPrice, "right");
  setCellFormattedText(rowTarget.quantityCell, item.quantity, "right");
  setCellFormattedText(rowTarget.totalCell, item.total, "right");
}

/**
 * Validates that the requested item count is a positive finite integer.
 */
export function validateItemCount(itemCount: unknown): asserts itemCount is number {
  if (
    typeof itemCount !== "number" ||
    !Number.isInteger(itemCount) ||
    itemCount <= 0 ||
    !Number.isFinite(itemCount)
  ) {
    throw new DocumentItemCountError(
      `Invalid item count: ${String(itemCount)}. Item count must be a positive integer (>= 1).`
    );
  }
}

/**
 * Deeply clones an item prototype row, ensuring that all formatting, properties,
 * borders, widths, and run styling are preserved, while cell text is reset to empty string.
 */
export function createCleanItemRowClone(prototypeRow: Element): Element {
  const cloned = prototypeRow.cloneNode(true) as Element;
  const cells = getChildElements(cloned, "w:tc");
  for (let i = 0; i < cells.length; i++) {
    const tNodes = cells[i].getElementsByTagName("w:t");
    for (let t = 0; t < tNodes.length; t++) {
      tNodes[t].textContent = "";
    }
  }
  return cloned;
}

/**
 * Validates the complete quotation document table structure:
 * - Table 1 (Header), Table 2 (Customer), Table 3 (Items), and Table 4 (Total) exist.
 * - Table 3 has a valid 7-column header row.
 * - Table 3 has at least 1 item row.
 * - Every item row has exactly 7 cells with expected column widths.
 * - Table 4 has the Total Amount row and follows Table 3 (total row is last).
 */
export function validateQuotationDocumentStructure(dom: Document): void {
  const body = dom.getElementsByTagName("w:body")[0];
  if (!body) {
    throw new DocumentStructureError("Document is missing <w:body> element");
  }

  const tables = getChildElements(body, "w:tbl");
  if (tables.length < 4) {
    throw new DocumentStructureError(
      `Canonical template requires 4 tables, found ${tables.length}`
    );
  }

  const table3 = tables[2];
  const table4 = tables[3];

  const t3Rows = getChildElements(table3, "w:tr");
  if (t3Rows.length < 2) {
    throw new DocumentStructureError(
      `Table 3 must contain at least 1 header row and 1 item row, found ${t3Rows.length}`
    );
  }

  // Header row validation
  const headerRow = t3Rows[0];
  const headerCells = getChildElements(headerRow, "w:tc");
  if (headerCells.length !== 7) {
    throw new DocumentStructureError(
      `Table 3 header row must contain 7 columns, found ${headerCells.length}`
    );
  }

  // Item rows validation
  const itemRows = t3Rows.slice(1);
  for (let r = 0; r < itemRows.length; r++) {
    const row = itemRows[r];
    const cells = getChildElements(row, "w:tc");
    if (cells.length !== 7) {
      throw new DocumentStructureError(
        `Item row ${r + 1} must contain exactly 7 cells, found ${cells.length}`
      );
    }

    for (let c = 0; c < 7; c++) {
      const tcW = cells[c].getElementsByTagName("w:tcW")[0];
      const width = tcW ? Number(tcW.getAttribute("w:w")) : null;
      if (width !== ITEM_TABLE_COLUMN_WIDTHS_DXA[c]) {
        throw new DocumentStructureError(
          `Item row ${r + 1} column ${c + 1} width mismatch: expected ${ITEM_TABLE_COLUMN_WIDTHS_DXA[c]} dxa, found ${width} dxa`
        );
      }
    }
  }

  // Table 4 (Total row) validation
  const t4Rows = getChildElements(table4, "w:tr");
  if (t4Rows.length !== 1) {
    throw new DocumentStructureError(
      `Table 4 must contain exactly 1 total row, found ${t4Rows.length}`
    );
  }

  const totalCells = getChildElements(t4Rows[0], "w:tc");
  if (totalCells.length < 3) {
    throw new DocumentStructureError(
      `Table 4 total row must contain at least 3 cells, found ${totalCells.length}`
    );
  }

  const totalLabel = getCellText(totalCells[0]);
  if (!totalLabel.includes("Total Amount:")) {
    throw new DocumentStructureError(
      `Table 4 total row must contain "Total Amount:" label, found "${totalLabel}"`
    );
  }

  // Verify Table 4 is positioned immediately after Table 3 in document body
  let nextEl = table3.nextSibling;
  while (nextEl && nextEl.nodeType !== 1) {
    nextEl = nextEl.nextSibling;
  }
  if (nextEl !== table4) {
    throw new DocumentStructureError(
      "Table 4 (Total row) must immediately follow Table 3 (Items) in document body"
    );
  }
}

/**
 * Dynamically adjusts Table 3 item rows to match the requested itemCount:
 * - Validates itemCount (positive integer).
 * - Preserves Table 3 Row 0 (Header).
 * - Preserves Table 4 Row 0 (Total row, remaining last).
 * - Shrinks rows if itemCount < existing.
 * - Expands rows using prototype clone if itemCount > existing.
 * - Idempotent if itemCount === existing.
 * - Validates document structure and returns strongly-typed row targets in order.
 */
export function prepareItemRows(
  dom: Document,
  itemCount: number,
  prototypeOverride?: Element
): Table3ItemRowTarget[] {
  validateItemCount(itemCount);

  const body = dom.getElementsByTagName("w:body")[0];
  if (!body) {
    throw new DocumentStructureError("Document is missing <w:body> element");
  }

  const tables = getChildElements(body, "w:tbl");
  if (tables.length < 4) {
    throw new DocumentStructureError(
      `Canonical template requires 4 tables, found ${tables.length}`
    );
  }

  const table3 = tables[2];
  const existingRows = getChildElements(table3, "w:tr");
  if (existingRows.length < 2) {
    throw new DocumentStructureError(
      `Table 3 must contain at least 1 header row and 1 item row, found ${existingRows.length}`
    );
  }

  const prototypeElement = prototypeOverride ?? existingRows[1];
  const currentItemRows = existingRows.slice(1);
  const currentCount = currentItemRows.length;

  if (currentCount > itemCount) {
    // Remove excess rows from the end
    for (let i = currentCount - 1; i >= itemCount; i--) {
      table3.removeChild(currentItemRows[i]);
    }
  } else if (currentCount < itemCount) {
    // Clone prototype and insert additional rows
    const additionalCount = itemCount - currentCount;
    for (let i = 0; i < additionalCount; i++) {
      const clonedRow = createCleanItemRowClone(prototypeElement);
      table3.appendChild(clonedRow);
    }
  }

  // Validate resulting structure
  validateQuotationDocumentStructure(dom);

  // Return refreshed item row targets
  return extractTable3Targets(table3).itemRows;
}

export const generateItemRows = prepareItemRows;

