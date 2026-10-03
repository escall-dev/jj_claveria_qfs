export type QuotationStatus = "draft" | "pending" | "approved" | "rejected";

export interface QuotationItem {
  id?: string;
  itemNumber: number;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  amount: number;
  brand?: string;
  notes?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  date: string;
  status: QuotationStatus;
  items: QuotationItem[];
  subtotal: number;
  vatRate?: number;
  vatAmount?: number;
  discount?: number;
  totalAmount: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Quotation line item form representation used in dynamic row editor.
 * Maintains client-side state, catalog reference links, and snapshot values.
 */
export interface QuotationItemFormState {
  /** Stable client-side UUID for React key */
  id: string;
  /** Catalog product ID if linked to an existing product */
  productId?: string | null;
  /** Item description / product name */
  description: string;
  /** Brand ID if linked to a catalog brand */
  brandId?: string | null;
  /** Brand name (catalog or custom) */
  brandName?: string;
  /** Unit of measurement (name or abbreviation) */
  uom: string;
  /** Unit price input value (stored as string or number for input handling) */
  unitPrice: number | string;
  /** Quantity input value (stored as string or number for input handling) */
  quantity: number | string;
  /** Item total preview / placeholder */
  itemTotal?: number | string | null;
}

/**
 * Quotation form header and body state for Phase 9 New Quotation Form.
 */
export interface QuotationFormState {
  date: string;
  qfNumber: string;
  companyName: string;
  companyAddress: string;
  contactPerson: string;
  contactNumber: string;
  items: QuotationItemFormState[];
}
