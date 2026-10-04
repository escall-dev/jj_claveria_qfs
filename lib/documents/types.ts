import type { Element, Node } from "@xmldom/xmldom";


export interface TemplateMetadata {
  readonly filePath: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly tableCount: number;
  readonly bodyParagraphCount: number;
  readonly preallocatedItemRowCount: number;
}

export interface Table1HeaderTarget {
  readonly companyInfoCell: Element;
  readonly metaInfoCell: Element;
  readonly dateTextNode: Node | null;
  readonly qfNumberTextNode: Node | null;
}

export interface Table2CustomerTargets {
  readonly nameCell: Element;
  readonly addressCell: Element;
  readonly contactPersonCell: Element;
  readonly contactNumberCell: Element;
}

export interface Table3ItemRowTarget {
  readonly rowIndex: number;
  readonly rowElement: Element;
  readonly itemNumberCell: Element;
  readonly descriptionCell: Element;
  readonly brandCell: Element;
  readonly uomCell: Element;
  readonly unitPriceCell: Element;
  readonly quantityCell: Element;
  readonly totalCell: Element;
}

export interface ItemRowPrototype {
  /** The canonical w:tr element (Row 2, index 1) */
  readonly element: Element;
  /** Known column widths in dxa: [864, 3168, 1296, 1440, 1152, 1008, 1152] */
  readonly columnWidthsDxa: readonly [864, 3168, 1296, 1440, 1152, 1008, 1152];
  readonly columnCount: 7;
  /** Clones this prototype row deeply for subsequent dynamic generation (Phase 13) */
  clone(): Element;
}

export interface Table3QuotationItemTargets {
  readonly tableElement: Element;
  readonly headerRow: Element;
  readonly itemRows: Table3ItemRowTarget[];
  readonly prototype: ItemRowPrototype;
}

export interface Table4GrandTotalTarget {
  readonly tableElement: Element;
  readonly rowElement: Element;
  readonly labelCell: Element;
  readonly quantitySpacerCell: Element;
  readonly grandTotalCell: Element;
}

export interface DocumentTargetMap {
  readonly table1: Table1HeaderTarget;
  readonly table2: Table2CustomerTargets;
  readonly table3: Table3QuotationItemTargets;
  readonly table4: Table4GrandTotalTarget;
}

/**
 * Decoupled input representation for document population.
 * The document layer requires formatted display strings, not raw DB rows.
 */
export interface QuotationDocumentItemInput {
  itemNumber: number;
  description: string;
  brand: string;
  uom: string;
  unitPrice: string;
  quantity: string;
  total: string;
}

export interface QuotationDocumentInput {
  date: string;
  quotationNumber: string;
  customerName: string;
  customerAddress?: string;
  contactPerson?: string;
  contactNumber?: string;
  grandTotal: string;
  items?: QuotationDocumentItemInput[];
}
