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
