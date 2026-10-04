/**
 * Quotation Calculations Module Boundary for JJ Claveria QFS.
 *
 * Authoritative, pure deterministic calculation engine:
 * - Line item amount calculation: Unit Price × Quantity (rounded to 2 decimal places)
 * - Financial precision handling with scaled BigInt math (eliminating float artifacts like 0.1 * 3)
 * - Quotation total aggregation: SUM(rounded Item Totals)
 * - Safe validation against NaN, Infinity, negative values, and non-numeric inputs
 * - Standard currency formatting utilities
 */

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export type NumericValue = number | string;

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

export interface ItemCalculationInput {
  id?: string;
  unitPrice: NumericValue;
  quantity: NumericValue;
}

export interface ItemCalculationSuccess {
  success: true;
  id?: string;
  unitPrice: number;
  quantity: number;
  itemTotal: number;
  formattedTotal: string;
  formattedCurrency: string;
}

export type ItemCalculationErrorCode =
  | "INVALID_UNIT_PRICE"
  | "NEGATIVE_UNIT_PRICE"
  | "INVALID_QUANTITY"
  | "NON_POSITIVE_QUANTITY"
  | "NON_FINITE_VALUE";

export interface ItemCalculationError {
  success: false;
  id?: string;
  unitPrice?: number;
  quantity?: number;
  itemTotal: null;
  error: string;
  errorCode: ItemCalculationErrorCode;
}

export type ItemCalculationResult = ItemCalculationSuccess | ItemCalculationError;

export interface QuotationCalculationSuccess {
  success: true;
  items: ItemCalculationSuccess[];
  subtotal: number;
  totalAmount: number;
  validItemsSubtotal: number;
  formattedTotal: string;
  formattedSubtotal: string;
  hasErrors: false;
  errors: [];
}

export interface QuotationCalculationFailure {
  success: false;
  items: ItemCalculationResult[];
  subtotal: null;
  totalAmount: null;
  validItemsSubtotal: number;
  formattedTotal: string;
  formattedSubtotal: string;
  hasErrors: true;
  errors: string[];
}

export type QuotationCalculationResult =
  | QuotationCalculationSuccess
  | QuotationCalculationFailure;

// ==========================================
// 2. PRECISION DECIMAL ARITHMETIC
// ==========================================

export interface ParsedDecimal {
  isNegative: boolean;
  intPart: string;
  fracPart: string;
  big: bigint;
  scale: number;
  num: number;
}

export type DecimalParseErrorCode =
  | "INVALID_TYPE"
  | "EMPTY_VALUE"
  | "INVALID_FORMAT"
  | "NON_FINITE_VALUE";

export type ParseDecimalResult =
  | { success: true; data: ParsedDecimal }
  | { success: false; error: string; code: DecimalParseErrorCode };

/**
 * Parses any number or string into exact decimal components.
 * Strictly rejects non-finite values (NaN, Infinity, -Infinity), empty values, and non-numeric formats.
 */
export function parseDecimal(val: unknown, fieldName = "Value"): ParseDecimalResult {
  if (val === null || val === undefined) {
    return {
      success: false,
      error: `${fieldName} is required.`,
      code: "EMPTY_VALUE",
    };
  }

  let str: string;
  if (typeof val === "number") {
    if (Number.isNaN(val)) {
      return {
        success: false,
        error: `${fieldName} cannot be NaN.`,
        code: "NON_FINITE_VALUE",
      };
    }
    if (!Number.isFinite(val)) {
      return {
        success: false,
        error: `${fieldName} must be a finite number.`,
        code: "NON_FINITE_VALUE",
      };
    }
    const rawStr = String(val);
    if (rawStr.includes("e") || rawStr.includes("E")) {
      str = val.toFixed(20).replace(/0+$/, "").replace(/\.$/, "");
    } else {
      str = rawStr;
    }
  } else if (typeof val === "string") {
    str = val.trim();
    if (str === "") {
      return {
        success: false,
        error: `${fieldName} is required.`,
        code: "EMPTY_VALUE",
      };
    }
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(str)) {
      return {
        success: false,
        error: `${fieldName} must be a valid number.`,
        code: "INVALID_FORMAT",
      };
    }
    const num = Number(str);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return {
        success: false,
        error: `${fieldName} must be a valid finite number.`,
        code: "NON_FINITE_VALUE",
      };
    }
  } else {
    return {
      success: false,
      error: `${fieldName} must be a number or string.`,
      code: "INVALID_TYPE",
    };
  }

  const isNegative = str.startsWith("-");
  let unsignedStr = str;
  if (unsignedStr.startsWith("+") || unsignedStr.startsWith("-")) {
    unsignedStr = unsignedStr.slice(1);
  }

  const parts = unsignedStr.split(".");
  let intPart = parts[0] || "0";
  const fracPart = parts[1] || "";

  if (intPart === "") {
    intPart = "0";
  }

  const combinedDigits = intPart + fracPart;
  const big = combinedDigits === "" ? BigInt(0) : BigInt(combinedDigits);
  const scale = fracPart.length;
  const num = Number(str);

  return {
    success: true,
    data: {
      isNegative,
      intPart,
      fracPart,
      big,
      scale,
      num,
    },
  };
}

/**
 * Multiplies two parsed decimals and rounds the monetary total to targetScale (default 2 decimals).
 * Uses half-up financial rounding on the BigInt scaled product.
 */
export function multiplyDecimals(
  price: ParsedDecimal,
  qty: ParsedDecimal,
  targetScale = 2
): { cents: bigint; value: number } {
  const isNegative = price.isNegative !== qty.isNegative;
  const rawProduct = price.big * qty.big;
  const totalScale = price.scale + qty.scale;

  let scaledProduct: bigint;
  if (totalScale <= targetScale) {
    const shift = targetScale - totalScale;
    scaledProduct = rawProduct * (BigInt(10) ** BigInt(shift));
  } else {
    const diff = totalScale - targetScale;
    const divisor = BigInt(10) ** BigInt(diff);
    const half = divisor / BigInt(2);
    // Half-up rounding
    scaledProduct = (rawProduct + half) / divisor;
  }

  const signedCents = isNegative ? -scaledProduct : scaledProduct;
  const value = Number(signedCents) / Math.pow(10, targetScale);

  return {
    cents: signedCents,
    value,
  };
}

// ==========================================
// 3. CURRENCY FORMATTING
// ==========================================

/**
 * Formats a monetary number into standard Philippine peso string representation.
 * Example: 351.5 -> "₱ 351.50"
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "—";
  }
  return `₱ ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a monetary number with 2 decimal places and thousands separators.
 * Example: 351.5 -> "351.50"
 */
export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0.00";
  }
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ==========================================
// 4. LINE ITEM CALCULATION
// ==========================================

/**
 * Calculates line-item total: Unit Price × Quantity.
 * Result is rounded to 2 decimal places using deterministic financial rounding.
 *
 * Rules:
 * - Unit Price: valid number >= 0 (zero is valid).
 * - Quantity: valid number > 0 (supports up to 3 decimal places).
 * - Invalid inputs (NaN, Infinity, negative, empty string) are explicitly rejected.
 */
export function calculateItemTotal(
  unitPrice: NumericValue,
  quantity: NumericValue,
  id?: string
): ItemCalculationResult {
  // Validate Unit Price
  const parsedPrice = parseDecimal(unitPrice, "Unit price");
  if (!parsedPrice.success) {
    return {
      success: false,
      id,
      itemTotal: null,
      error: parsedPrice.error,
      errorCode:
        parsedPrice.code === "NON_FINITE_VALUE"
          ? "NON_FINITE_VALUE"
          : "INVALID_UNIT_PRICE",
    };
  }

  if (parsedPrice.data.isNegative || parsedPrice.data.num < 0) {
    return {
      success: false,
      id,
      unitPrice: parsedPrice.data.num,
      itemTotal: null,
      error: "Unit price cannot be negative.",
      errorCode: "NEGATIVE_UNIT_PRICE",
    };
  }

  // Validate Quantity
  const parsedQty = parseDecimal(quantity, "Quantity");
  if (!parsedQty.success) {
    return {
      success: false,
      id,
      unitPrice: parsedPrice.data.num,
      itemTotal: null,
      error: parsedQty.error,
      errorCode:
        parsedQty.code === "NON_FINITE_VALUE"
          ? "NON_FINITE_VALUE"
          : "INVALID_QUANTITY",
    };
  }

  if (parsedQty.data.isNegative || parsedQty.data.num <= 0) {
    return {
      success: false,
      id,
      unitPrice: parsedPrice.data.num,
      quantity: parsedQty.data.num,
      itemTotal: null,
      error: "Quantity must be greater than zero.",
      errorCode: "NON_POSITIVE_QUANTITY",
    };
  }

  // Exact multiplication and half-up rounding to 2 decimals
  const { value } = multiplyDecimals(parsedPrice.data, parsedQty.data, 2);

  return {
    success: true,
    id,
    unitPrice: parsedPrice.data.num,
    quantity: parsedQty.data.num,
    itemTotal: value,
    formattedTotal: formatAmount(value),
    formattedCurrency: formatCurrency(value),
  };
}

/**
 * Safe helper returning exact numeric total or null if invalid.
 */
export function calculateItemTotalSafe(
  unitPrice: NumericValue,
  quantity: NumericValue
): number | null {
  const result = calculateItemTotal(unitPrice, quantity);
  return result.success ? result.itemTotal : null;
}

// ==========================================
// 5. QUOTATION TOTAL CALCULATION
// ==========================================

/**
 * Calculates total quotation amounts from line items.
 *
 * Requirements:
 * - Deterministic behavior on empty items array (returns 0, not NaN).
 * - Total Amount = SUM(rounded Item Totals).
 * - Accumulates using integer cents to prevent floating-point drift.
 * - Rejects any invalid item (NaN, Infinity, negative price, <= 0 quantity) by setting
 *   success to false and totalAmount to null, preventing invalid values from reaching the total.
 * - Provides validItemsSubtotal for live drafting previews when some rows are incomplete.
 */
export function calculateQuotationTotal(
  items: ItemCalculationInput[]
): QuotationCalculationResult {
  if (!items || items.length === 0) {
    return {
      success: true,
      items: [],
      subtotal: 0,
      totalAmount: 0,
      validItemsSubtotal: 0,
      formattedTotal: "₱ 0.00",
      formattedSubtotal: "₱ 0.00",
      hasErrors: false,
      errors: [],
    };
  }

  const calculatedItems: ItemCalculationResult[] = [];
  const errors: string[] = [];
  let totalCents = BigInt(0);
  let validItemsCents = BigInt(0);
  let allValid = true;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemResult = calculateItemTotal(item.unitPrice, item.quantity, item.id);
    calculatedItems.push(itemResult);

    if (itemResult.success) {
      const cents = BigInt(Math.round(itemResult.itemTotal * 100));
      totalCents += cents;
      validItemsCents += cents;
    } else {
      allValid = false;
      errors.push(`Item ${i + 1}: ${itemResult.error}`);
    }
  }

  const validItemsSubtotal = Number(validItemsCents) / 100;

  if (!allValid) {
    return {
      success: false,
      items: calculatedItems,
      subtotal: null,
      totalAmount: null,
      validItemsSubtotal,
      formattedTotal: "—",
      formattedSubtotal: "—",
      hasErrors: true,
      errors,
    };
  }

  const total = Number(totalCents) / 100;

  return {
    success: true,
    items: calculatedItems as ItemCalculationSuccess[],
    subtotal: total,
    totalAmount: total,
    validItemsSubtotal: total,
    formattedTotal: formatCurrency(total),
    formattedSubtotal: formatCurrency(total),
    hasErrors: false,
    errors: [],
  };
}

/**
 * Calculates sum of currently valid items for UI drafting preview.
 * Returns 0 if no valid items exist.
 */
export function calculateDraftSubtotal(items: ItemCalculationInput[]): number {
  if (!items || items.length === 0) return 0;
  let cents = BigInt(0);
  for (const item of items) {
    const res = calculateItemTotal(item.unitPrice, item.quantity);
    if (res.success) {
      cents += BigInt(Math.round(res.itemTotal * 100));
    }
  }
  return Number(cents) / 100;
}

/**
 * Safe helper returning authoritative total amount or null if any item is invalid.
 */
export function calculateQuotationTotalSafe(
  items: ItemCalculationInput[]
): number | null {
  const result = calculateQuotationTotal(items);
  return result.success ? result.totalAmount : null;
}
