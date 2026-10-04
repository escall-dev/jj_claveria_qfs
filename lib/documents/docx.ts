import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Document, Element } from "@xmldom/xmldom";
import { DocumentStructureError } from "../errors.ts";
import {
  loadTemplateBuffer,
  assertNotCanonicalTemplate,
  computeSha256,
} from "./template.ts";
import {
  extractDocumentTargets,
  getChildElements,
  prepareItemRows,
  validateQuotationDocumentStructure,
  createCleanItemRowClone,
} from "./targets.ts";
import type {
  DocumentTargetMap,
  ItemRowPrototype,
  Table3ItemRowTarget,
} from "./types.ts";

if (typeof window !== "undefined") {
  throw new Error(
    "WorkingDocument is a server-only module and cannot be imported in the browser."
  );
}

/**
 * WorkingDocument encapsulates an in-memory mutable representation of a DOCX quotation document.
 * It provides safe DOM-level manipulation of WordprocessingML tables, rows, cells, and runs
 * while preserving all original template fonts, spacing, margins, and layout.
 */
export class WorkingDocument {
  private readonly zip: JSZip;
  private readonly dom: Document;
  private readonly xmlEntryPath: string;
  private readonly prototypeRowElement: Element;

  constructor(zip: JSZip, dom: Document, xmlEntryPath = "word/document.xml") {
    this.zip = zip;
    this.dom = dom;
    this.xmlEntryPath = xmlEntryPath;

    const tables = this.getTables();
    if (tables.length >= 3) {
      const t3Rows = getChildElements(tables[2], "w:tr");
      if (t3Rows.length >= 2) {
        this.prototypeRowElement = createCleanItemRowClone(t3Rows[1]);
      } else {
        throw new DocumentStructureError(
          `Table 3 requires at least 2 rows for prototype capture, found ${t3Rows.length}`
        );
      }
    } else {
      throw new DocumentStructureError(
        `Document requires at least 3 tables, found ${tables.length}`
      );
    }
  }

  /**
   * Loads a WorkingDocument from a Buffer, a file path, or the canonical template.
   */
  public static async load(
    source?: Buffer | string,
    options?: { verifyIntegrity?: boolean }
  ): Promise<WorkingDocument> {
    let buffer: Buffer;

    if (!source) {
      buffer = await loadTemplateBuffer({
        verifyIntegrity: options?.verifyIntegrity,
      });
    } else if (typeof source === "string") {
      buffer = await fs.promises.readFile(path.resolve(source));
    } else {
      buffer = source;
    }

    const zip = await JSZip.loadAsync(buffer);
    const xmlEntryPath = "word/document.xml";
    const xmlFile = zip.file(xmlEntryPath);

    if (!xmlFile) {
      throw new DocumentStructureError(
        `Invalid DOCX package: missing ${xmlEntryPath}`
      );
    }

    const xmlContent = await xmlFile.async("string");
    const dom = new DOMParser().parseFromString(xmlContent, "text/xml");

    const rootElement = dom.documentElement;
    if (!rootElement || rootElement.nodeName === "parsererror") {
      throw new DocumentStructureError(
        "Failed to parse WordprocessingML document.xml"
      );
    }

    return new WorkingDocument(zip, dom, xmlEntryPath);
  }

  /**
   * Returns the underlying W3C Document DOM.
   */
  public getDom(): Document {
    return this.dom;
  }

  /**
   * Returns the underlying JSZip instance.
   */
  public getZip(): JSZip {
    return this.zip;
  }

  /**
   * Returns all top-level tables (<w:tbl>) in the document body.
   */
  public getTables(): Element[] {
    const body = this.dom.getElementsByTagName("w:body")[0];
    if (!body) {
      throw new DocumentStructureError("Document is missing <w:body> element");
    }
    return getChildElements(body, "w:tbl");
  }

  /**
   * Returns a specific top-level table by 0-based index.
   */
  public getTable(index: number): Element {
    const tables = this.getTables();
    if (index < 0 || index >= tables.length) {
      throw new DocumentStructureError(
        `Table index out of bounds: requested ${index}, total available ${tables.length}`
      );
    }
    return tables[index];
  }

  /**
   * Extracts strongly-typed document targets across all 4 canonical tables.
   */
  public getTargets(): DocumentTargetMap {
    return extractDocumentTargets(this.dom);
  }

  /**
   * Retrieves the repeatable item row prototype (Table 3, Row 2, index 1)
   * ready for cloning during dynamic generation in Phase 13.
   */
  public getItemRowPrototype(): ItemRowPrototype {
    const targets = this.getTargets();
    return targets.table3.prototype;
  }

  /**
   * Prepares the quotation item rows dynamically to match the requested itemCount.
   * Fully idempotent, reconfigurable, and validated.
   */
  public prepareItemRows(itemCount: number): Table3ItemRowTarget[] {
    return prepareItemRows(this.dom, itemCount, this.prototypeRowElement);
  }

  /**
   * Alias for prepareItemRows.
   */
  public generateItemRows(itemCount: number): Table3ItemRowTarget[] {
    return this.prepareItemRows(itemCount);
  }

  /**
   * Returns current ordered item row targets from Table 3.
   */
  public getItemRows(): Table3ItemRowTarget[] {
    const targets = this.getTargets();
    return targets.table3.itemRows;
  }

  /**
   * Returns Table 3 header row element.
   */
  public getHeaderRow(): Element {
    const targets = this.getTargets();
    return targets.table3.headerRow;
  }

  /**
   * Returns Table 4 total row element.
   */
  public getTotalRow(): Element {
    const targets = this.getTargets();
    return targets.table4.rowElement;
  }

  /**
   * Returns all rows of the quotation item and total compound table structure in order:
   * [Header, Item 1, ..., Item N, Total Row].
   */
  public getQuotationTableRows(): Element[] {
    const headerRow = this.getHeaderRow();
    const itemRows = this.getItemRows().map((target) => target.rowElement);
    const totalRow = this.getTotalRow();
    return [headerRow, ...itemRows, totalRow];
  }

  /**
   * Confirms that the total row structurally follows all item rows as the final row of the quotation table area.
   */
  public isTotalRowLast(): boolean {
    const quotationRows = this.getQuotationTableRows();
    const totalRow = this.getTotalRow();
    return quotationRows.length > 0 && quotationRows[quotationRows.length - 1] === totalRow;
  }

  /**
   * Validates document table structure against canonical layout rules.
   */
  public validateDocumentStructure(): void {
    validateQuotationDocumentStructure(this.dom);
  }

  /**
   * Serializes the current XML DOM back to a string.
   */
  public serializeXml(): string {
    return new XMLSerializer().serializeToString(this.dom);
  }

  /**
   * Generates a complete, valid .docx binary Buffer from the working document.
   */
  public async saveToBuffer(): Promise<Buffer> {
    const serializedXml = this.serializeXml();
    this.zip.file(this.xmlEntryPath, serializedXml);

    const generated = await this.zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return generated;
  }

  /**
   * Saves the working document to disk at targetPath.
   * STRICT SAFEGUARD: Throws TemplateImmutabilityError if targetPath is the canonical template!
   */
  public async saveToFile(targetPath: string): Promise<void> {
    assertNotCanonicalTemplate(targetPath);
    const buffer = await this.saveToBuffer();
    await fs.promises.mkdir(path.dirname(path.resolve(targetPath)), {
      recursive: true,
    });
    await fs.promises.writeFile(path.resolve(targetPath), buffer);
  }

  /**
   * Computes the SHA-256 hash of the generated document buffer.
   */
  public async computeHash(): Promise<string> {
    const buffer = await this.saveToBuffer();
    return computeSha256(buffer);
  }
}
