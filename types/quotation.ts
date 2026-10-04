export type QuotationStatus = "draft" | "pending" | "approved" | "rejected" | "finalized" | "cancelled";

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
  customerAddress?: string;
  contactPerson?: string;
  contactNumber?: string;
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
 * Database schema model for a quotation record in Supabase (Phase 11).
 * Features historical customer snapshots.
 */
export interface DatabaseQuotation {
  id: string;
  qf_number: string;
  quotation_date: string;
  customer_id: string | null;
  customer_name: string;
  customer_address: string;
  contact_person: string | null;
  contact_number: string | null;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema model for an individual quotation line item in Supabase (Phase 11).
 * Features immutable historical line item snapshots.
 */
export interface DatabaseQuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  item_number: number;
  item_description: string;
  brand_name: string | null;
  uom: string;
  unit_price: number;
  quantity: number;
  item_total: number;
  created_at: string;
}

/**
 * Fully hydrated quotation containing header and historical item snapshots.
 */
export interface QuotationWithItems extends DatabaseQuotation {
  items: DatabaseQuotationItem[];
}

/**
 * Summary representation for Quotation History listing (/quotations).
 */
export interface QuotationSummary {
  id: string;
  qf_number: string;
  quotation_date: string;
  customer_name: string;
  customer_address: string;
  contact_person: string | null;
  contact_number: string | null;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
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
 * Quotation form header and body state for Phase 9 & Phase 11 New Quotation Form.
 */
export interface QuotationFormState {
  date: string;
  qfNumber: string;
  customerId?: string | null;
  companyName: string;
  companyAddress: string;
  contactPerson: string;
  contactNumber: string;
  items: QuotationItemFormState[];
}

/**
 * Server Action result for quotation persistence operations.
 */
export interface SaveQuotationActionResult {
  success: boolean;
  quotationId?: string;
  qfNumber?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  itemErrors?: Record<string, {
    description?: string[];
    uom?: string[];
    unitPrice?: string[];
    quantity?: string[];
  }>;
}
