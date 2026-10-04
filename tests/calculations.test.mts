import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateItemTotal,
  calculateItemTotalSafe,
  calculateQuotationTotal,
  calculateQuotationTotalSafe,
  calculateDraftSubtotal,
  formatCurrency,
  formatAmount,
} from "../lib/calculations/index.ts";

test("1. Basic line item calculation: 100 × 2 = 200", () => {
  const result = calculateItemTotal(100, 2);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.itemTotal, 200);
    assert.strictEqual(result.formattedTotal, "200.00");
    assert.strictEqual(result.formattedCurrency, "₱ 200.00");
  }

  // Also test with string inputs
  const stringResult = calculateItemTotal("100", "2");
  assert.strictEqual(stringResult.success, true);
  if (stringResult.success) {
    assert.strictEqual(stringResult.itemTotal, 200);
  }
});

test("2. Decimal price: 99.99 × 3 = 299.97", () => {
  const result = calculateItemTotal(99.99, 3);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.itemTotal, 299.97);
    assert.strictEqual(result.formattedTotal, "299.97");
    assert.strictEqual(result.formattedCurrency, "₱ 299.97");
  }

  const strResult = calculateItemTotal("99.99", "3");
  assert.strictEqual(strResult.success, true);
  if (strResult.success) {
    assert.strictEqual(strResult.itemTotal, 299.97);
  }
});

test("3. Zero price: 0 × 10 = 0", () => {
  const result = calculateItemTotal(0, 10);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.itemTotal, 0);
    assert.strictEqual(result.formattedTotal, "0.00");
    assert.strictEqual(result.formattedCurrency, "₱ 0.00");
  }

  const strResult = calculateItemTotal("0", "10");
  assert.strictEqual(strResult.success, true);
  if (strResult.success) {
    assert.strictEqual(strResult.itemTotal, 0);
  }
});

test("4. Decimal quantity: 100 × 1.5 = 150", () => {
  const result = calculateItemTotal(100, 1.5);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.itemTotal, 150);
    assert.strictEqual(result.formattedTotal, "150.00");
    assert.strictEqual(result.formattedCurrency, "₱ 150.00");
  }

  const strResult = calculateItemTotal("100", "1.5");
  assert.strictEqual(strResult.success, true);
  if (strResult.success) {
    assert.strictEqual(strResult.itemTotal, 150);
  }
});

test("5. Three-decimal quantity: 100 × 2.125 = 212.50", () => {
  const result = calculateItemTotal(100, 2.125);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.itemTotal, 212.5);
    assert.strictEqual(result.formattedTotal, "212.50");
    assert.strictEqual(result.formattedCurrency, "₱ 212.50");
  }

  const strResult = calculateItemTotal("100", "2.125");
  assert.strictEqual(strResult.success, true);
  if (strResult.success) {
    assert.strictEqual(strResult.itemTotal, 212.5);
  }
});

test("6. Floating-point-sensitive calculation: 0.1 × 3 = 0.30 (not 0.30000000000000004)", () => {
  const result = calculateItemTotal(0.1, 3);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.itemTotal, 0.3);
    assert.strictEqual(result.formattedTotal, "0.30");
    assert.strictEqual(result.formattedCurrency, "₱ 0.30");
  }

  const strResult = calculateItemTotal("0.1", "3");
  assert.strictEqual(strResult.success, true);
  if (strResult.success) {
    assert.strictEqual(strResult.itemTotal, 0.3);
    assert.strictEqual(strResult.formattedTotal, "0.30");
  }
});

test("7. Multiple items summation: 100×2 + 50.50×3 + 10.25×2 = 372.00", () => {
  const items = [
    { unitPrice: 100, quantity: 2 },
    { unitPrice: 50.5, quantity: 3 },
    { unitPrice: 10.25, quantity: 2 },
  ];

  const result = calculateQuotationTotal(items);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.subtotal, 372.0);
    assert.strictEqual(result.totalAmount, 372.0);
    assert.strictEqual(result.formattedTotal, "₱ 372.00");
    assert.strictEqual(result.items.length, 3);
    assert.strictEqual(result.items[0].itemTotal, 200.0);
    assert.strictEqual(result.items[1].itemTotal, 151.5);
    assert.strictEqual(result.items[2].itemTotal, 20.5);
  }

  assert.strictEqual(calculateQuotationTotalSafe(items), 372.0);
  assert.strictEqual(calculateDraftSubtotal(items), 372.0);
});

test("8. Empty items list returns deterministic 0 (not NaN)", () => {
  const result = calculateQuotationTotal([]);
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.subtotal, 0);
    assert.strictEqual(result.totalAmount, 0);
    assert.strictEqual(result.formattedTotal, "₱ 0.00");
    assert.strictEqual(result.hasErrors, false);
    assert.deepStrictEqual(result.items, []);
  }

  assert.strictEqual(calculateQuotationTotalSafe([]), 0);
  assert.strictEqual(calculateDraftSubtotal([]), 0);
});

test("9. Invalid quantity <= 0 is rejected", () => {
  // Quantity = 0
  const zeroQty = calculateItemTotal(100, 0);
  assert.strictEqual(zeroQty.success, false);
  if (!zeroQty.success) {
    assert.strictEqual(zeroQty.itemTotal, null);
    assert.strictEqual(zeroQty.errorCode, "NON_POSITIVE_QUANTITY");
  }

  // Quantity < 0
  const negQty = calculateItemTotal(100, -2);
  assert.strictEqual(negQty.success, false);
  if (!negQty.success) {
    assert.strictEqual(negQty.itemTotal, null);
    assert.strictEqual(negQty.errorCode, "NON_POSITIVE_QUANTITY");
  }

  // String negative
  const strNegQty = calculateItemTotal("100", "-1.5");
  assert.strictEqual(strNegQty.success, false);

  assert.strictEqual(calculateItemTotalSafe(100, 0), null);
  assert.strictEqual(calculateItemTotalSafe(100, -2), null);
});

test("10. Invalid unit price < 0 is rejected", () => {
  const negPrice = calculateItemTotal(-50, 2);
  assert.strictEqual(negPrice.success, false);
  if (!negPrice.success) {
    assert.strictEqual(negPrice.itemTotal, null);
    assert.strictEqual(negPrice.errorCode, "NEGATIVE_UNIT_PRICE");
  }

  const strNegPrice = calculateItemTotal("-0.01", 1);
  assert.strictEqual(strNegPrice.success, false);

  assert.strictEqual(calculateItemTotalSafe(-50, 2), null);
});

test("11. NaN cannot produce a valid-looking quotation total", () => {
  const itemResult = calculateItemTotal(NaN, 2);
  assert.strictEqual(itemResult.success, false);
  if (!itemResult.success) {
    assert.strictEqual(itemResult.itemTotal, null);
    assert.strictEqual(itemResult.errorCode, "NON_FINITE_VALUE");
  }

  const quoteResult = calculateQuotationTotal([
    { unitPrice: 100, quantity: 2 },
    { unitPrice: NaN, quantity: 1 },
  ]);
  assert.strictEqual(quoteResult.success, false);
  if (!quoteResult.success) {
    assert.strictEqual(quoteResult.totalAmount, null);
    assert.strictEqual(quoteResult.subtotal, null);
    assert.strictEqual(quoteResult.formattedTotal, "—");
    assert.strictEqual(quoteResult.hasErrors, true);
    assert.strictEqual(quoteResult.errors.length, 1);
  }

  assert.strictEqual(calculateQuotationTotalSafe([{ unitPrice: NaN, quantity: 1 }]), null);
});

test("12. Infinity cannot produce a valid-looking quotation total", () => {
  const itemInf = calculateItemTotal(Infinity, 1);
  assert.strictEqual(itemInf.success, false);
  if (!itemInf.success) {
    assert.strictEqual(itemInf.itemTotal, null);
    assert.strictEqual(itemInf.errorCode, "NON_FINITE_VALUE");
  }

  const itemNegInf = calculateItemTotal(100, -Infinity);
  assert.strictEqual(itemNegInf.success, false);

  const quoteInf = calculateQuotationTotal([
    { unitPrice: Infinity, quantity: 2 },
  ]);
  assert.strictEqual(quoteInf.success, false);
  if (!quoteInf.success) {
    assert.strictEqual(quoteInf.totalAmount, null);
    assert.strictEqual(quoteInf.formattedTotal, "—");
  }

  assert.strictEqual(calculateQuotationTotalSafe([{ unitPrice: Infinity, quantity: 1 }]), null);
});

test("13. Deterministic half-up rounding to 2 decimal places", () => {
  // 10.555 * 1 should round up to 10.56
  const roundUp = calculateItemTotal(10.555, 1);
  assert.strictEqual(roundUp.success, true);
  if (roundUp.success) {
    assert.strictEqual(roundUp.itemTotal, 10.56);
    assert.strictEqual(roundUp.formattedTotal, "10.56");
  }

  // 10.554 * 1 should round down to 10.55
  const roundDown = calculateItemTotal(10.554, 1);
  assert.strictEqual(roundDown.success, true);
  if (roundDown.success) {
    assert.strictEqual(roundDown.itemTotal, 10.55);
    assert.strictEqual(roundDown.formattedTotal, "10.55");
  }

  // 1.005 * 1 should round up to 1.01
  const halfEdge = calculateItemTotal(1.005, 1);
  assert.strictEqual(halfEdge.success, true);
  if (halfEdge.success) {
    assert.strictEqual(halfEdge.itemTotal, 1.01);
  }
});

test("14. Non-numeric and empty strings handled safely", () => {
  const emptyStr = calculateItemTotal("", 1);
  assert.strictEqual(emptyStr.success, false);

  const alphaStr = calculateItemTotal("abc", 1);
  assert.strictEqual(alphaStr.success, false);

  const multiDot = calculateItemTotal("10.5.2", 1);
  assert.strictEqual(multiDot.success, false);
});

test("15. Currency formatting produces standard Philippine peso format", () => {
  assert.strictEqual(formatCurrency(0), "₱ 0.00");
  assert.strictEqual(formatCurrency(351.5), "₱ 351.50");
  assert.strictEqual(formatCurrency(1234567.89), "₱ 1,234,567.89");
  assert.strictEqual(formatAmount(1234567.89), "1,234,567.89");
  assert.strictEqual(formatAmount(0), "0.00");
});
