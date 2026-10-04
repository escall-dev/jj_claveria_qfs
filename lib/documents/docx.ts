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
} from "./targets.ts";
import type {
  DocumentTargetMap,
  ItemRowPrototype,
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

  constructor(zip: JSZip, dom: Document, xmlEntryPath = "word/document.xml") {
    this.zip = zip;
    this.dom = dom;
    this.xmlEntryPath = xmlEntryPath;
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
