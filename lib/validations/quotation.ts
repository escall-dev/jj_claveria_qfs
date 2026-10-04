import type { QuotationFormState, QuotationItemFormState } from "@/types/quotation";

/**
 * Validation error details per item row, keyed by stable client-side item ID.
 */
export interface QuotationRowError {
  description?: string[];
  uom?: string[];
  unitPrice?: string[];
  quantity?: string[];
}

/**
 * Validation result for the New Quotation form.
 */
export interface QuotationFormValidationResult {
  success: boolean;
  error?: string;
  fieldErrors?: {
    date?: string[];
    qfNumber?: string[];
    customerId?: string[];
    companyName?: string[];
    companyAddress?: string[];
    contactPerson?: string[];
    contactNumber?: string[];
    items?: string[];
  };
  itemErrors?: Record<string, QuotationRowError>;
}

/**
 * Validates a single quotation line item in form state.
 */
export function validateQuotationItemRow(
  item: QuotationItemFormState
): { valid: boolean; errors: QuotationRowError } {
  const errors: QuotationRowError = {};
  let valid = true;

  // Description must not be blank
  const trimmedDesc = (item.description || "").trim();
  if (!trimmedDesc) {
    errors.description = ["Item description is required."];
    valid = false;
  }

  // UOM must be selected / not blank
  const trimmedUom = (item.uom || "").trim();
  if (!trimmedUom) {
    errors.uom = ["Unit of Measure (UOM) is required."];
    valid = false;
  }

  // Unit Price: must be a valid number >= 0
  const priceRaw = item.unitPrice;
  const priceNum = typeof priceRaw === "number" ? priceRaw : parseFloat(String(priceRaw || ""));
  if (priceRaw === "" || priceRaw === undefined || priceRaw === null || isNaN(priceNum)) {
    errors.unitPrice = ["Unit price is required and must be a number."];
    valid = false;
  } else if (priceNum < 0) {
    errors.unitPrice = ["Unit price cannot be negative."];
    valid = false;
  }

  // Quantity: must be a valid number > 0
  const qtyRaw = item.quantity;
  const qtyNum = typeof qtyRaw === "number" ? qtyRaw : parseFloat(String(qtyRaw || ""));
  if (qtyRaw === "" || qtyRaw === undefined || qtyRaw === null || isNaN(qtyNum)) {
    errors.quantity = ["Quantity is required and must be a number."];
    valid = false;
  } else if (qtyNum <= 0) {
    errors.quantity = ["Quantity must be greater than zero."];
    valid = false;
  }

  return { valid, errors };
}

/**
 * Validates the complete quotation form state.
 * Enforces date, QF#, company name, company address, and item table constraints.
 */
export function validateQuotationForm(
  data: QuotationFormState
): QuotationFormValidationResult {
  const fieldErrors: NonNullable<QuotationFormValidationResult["fieldErrors"]> = {};
  const itemErrors: Record<string, QuotationRowError> = {};
  let hasErrors = false;

  // Quotation Date
  const trimmedDate = (data.date || "").trim();
  if (!trimmedDate) {
    fieldErrors.date = ["Quotation date is required."];
    hasErrors = true;
  } else if (isNaN(Date.parse(trimmedDate))) {
    fieldErrors.date = ["Invalid quotation date format."];
    hasErrors = true;
  }

  // QF Number
  const trimmedQf = (data.qfNumber || "").trim();
  if (!trimmedQf) {
    fieldErrors.qfNumber = ["QF Number is required."];
    hasErrors = true;
  } else if (trimmedQf.length > 50) {
    fieldErrors.qfNumber = ["QF Number cannot exceed 50 characters."];
    hasErrors = true;
  }

  // Company Name
  const trimmedCompany = (data.companyName || "").trim();
  if (!trimmedCompany) {
    fieldErrors.companyName = ["Company name is required."];
    hasErrors = true;
  } else if (trimmedCompany.length > 200) {
    fieldErrors.companyName = ["Company name cannot exceed 200 characters."];
    hasErrors = true;
  }

  // Company Address
  const trimmedAddress = (data.companyAddress || "").trim();
  if (!trimmedAddress) {
    fieldErrors.companyAddress = ["Company address is required."];
    hasErrors = true;
  }

  // Optional Contact fields length checks
  if (data.contactPerson && data.contactPerson.trim().length > 100) {
    fieldErrors.contactPerson = ["Contact person cannot exceed 100 characters."];
    hasErrors = true;
  }

  if (data.contactNumber && data.contactNumber.trim().length > 50) {
    fieldErrors.contactNumber = ["Contact number cannot exceed 50 characters."];
    hasErrors = true;
  }

  // Items validation
  if (!data.items || data.items.length === 0) {
    fieldErrors.items = ["At least one quotation item is required."];
    hasErrors = true;
  } else {
    data.items.forEach((item) => {
      const { valid, errors } = validateQuotationItemRow(item);
      if (!valid) {
        itemErrors[item.id] = errors;
        hasErrors = true;
      }
    });
  }

  if (hasErrors) {
    return {
      success: false,
      error: "Please correct the highlighted errors before proceeding.",
      fieldErrors,
      itemErrors,
    };
  }

  return {
    success: true,
    fieldErrors: {},
    itemErrors: {},
  };
}
