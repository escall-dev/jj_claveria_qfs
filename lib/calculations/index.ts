/**
 * Quotation Calculations Module Boundary for JJ Claveria QFS.
 *
 * Responsible for:
 * - Line item amount calculation (quantity * unit price)
 * - Subtotal aggregation
 * - Tax / VAT calculation
 * - Discounts and total amount formatting
 */

export interface CalculationInputItem {
  quantity: number;
  unitPrice: number;
}

export interface CalculationSummary {
  subtotal: number;
  vatAmount: number;
  discountAmount: number;
  totalAmount: number;
}
