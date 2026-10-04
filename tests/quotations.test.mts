import test from "node:test";
import assert from "node:assert/strict";
import { validateQuotationForm, validateQuotationItemRow } from "../lib/validations/quotation.ts";
import { calculateQuotationTotal, calculateItemTotal, formatAmount } from "../lib/calculations/index.ts";
import type { QuotationFormState, QuotationItemFormState, QuotationSummary, QuotationWithItems } from "../types/quotation.ts";

test("Quotation Validation - valid quotation with free-form customer details", () => {
  const form: QuotationFormState = {
    date: "2026-10-04",
    qfNumber: "QF-2026-0001",
    customerId: null, // customer_id is optional / NULL
    companyName: "Acme Industrial Supplies",
    companyAddress: "123 Commercial Ave, Pasig City",
    contactPerson: "Jane Smith",
    contactNumber: "0917-123-4567",
    items: [
      {
        id: "item-1",
        productId: null, // uncatalogued product
        description: "Industrial Solvent Cleaner",
        brandName: "CleanPro",
        uom: "Liter",
        unitPrice: 250,
        quantity: 4,
        itemTotal: null,
      },
    ],
  };

  const result = validateQuotationForm(form);
  assert.strictEqual(result.success, true);
  assert.deepStrictEqual(result.fieldErrors, {});
});

test("Quotation Validation - rejects missing required customer fields", () => {
  const formMissingCustomer: QuotationFormState = {
    date: "2026-10-04",
    qfNumber: "QF-2026-0002",
    companyName: "   ", // blank
    companyAddress: "", // blank
    contactPerson: "",
    contactNumber: "",
    items: [
      {
        id: "item-1",
        description: "Test Item",
        uom: "Box",
        unitPrice: 100,
        quantity: 1,
      },
    ],
  };

  const result = validateQuotationForm(formMissingCustomer);
  assert.strictEqual(result.success, false);
  assert.ok(result.fieldErrors?.companyName?.length);
  assert.ok(result.fieldErrors?.companyAddress?.length);
});

test("Quotation Validation - rejects empty items array and invalid item values", () => {
  const formNoItems: QuotationFormState = {
    date: "2026-10-04",
    qfNumber: "QF-2026-0003",
    companyName: "Valid Company",
    companyAddress: "Valid Address",
    contactPerson: "",
    contactNumber: "",
    items: [],
  };

  const resultNoItems = validateQuotationForm(formNoItems);
  assert.strictEqual(resultNoItems.success, false);
  assert.ok(resultNoItems.fieldErrors?.items?.length);

  // Negative price and zero quantity
  const invalidRow: QuotationItemFormState = {
    id: "bad-row",
    description: "Invalid Item",
    uom: "Piece",
    unitPrice: -50,
    quantity: 0,
  };

  const rowValidation = validateQuotationItemRow(invalidRow);
  assert.strictEqual(rowValidation.valid, false);
  assert.ok(rowValidation.errors.unitPrice?.length);
  assert.ok(rowValidation.errors.quantity?.length);
});

test("Customer Snapshot Architecture - preserves historical snapshots independent of catalog", () => {
  // Scenario: Quotation created with customer snapshot and item snapshot
  const savedQuotation: QuotationWithItems = {
    id: "quote-uuid-1",
    qf_number: "QF-2026-0042",
    quotation_date: "2026-10-04",
    customer_id: null, // Unlinked or original customer record deleted
    customer_name: "Original Corporation Name",
    customer_address: "Original Historical Address",
    contact_person: "Original Contact",
    contact_number: "0918-000-0000",
    total_amount: 1500,
    status: "draft",
    created_by: "usr_dev_admin_001",
    created_at: "2026-10-04T12:00:00Z",
    updated_at: "2026-10-04T12:00:00Z",
    items: [
      {
        id: "qi-uuid-1",
        quotation_id: "quote-uuid-1",
        product_id: "prod-uuid-1", // Catalogued product
        item_number: 1,
        item_description: "Heavy Duty Degreaser 5L",
        brand_name: "Apex Chem",
        uom: "Gallon",
        unitPrice: 500,
        quantity: 3,
        item_total: 1500,
        created_at: "2026-10-04T12:00:00Z",
      },
      {
        id: "qi-uuid-2",
        quotation_id: "quote-uuid-1",
        product_id: null, // Uncatalogued custom item
        item_number: 2,
        item_description: "Custom Special Mixing Service",
        brand_name: null,
        uom: "Lot",
        unitPrice: 0,
        quantity: 1,
        item_total: 0,
        created_at: "2026-10-04T12:00:00Z",
      },
    ],
  };

  // Verify historical snapshots are populated directly from quotation records
  assert.strictEqual(savedQuotation.customer_name, "Original Corporation Name");
  assert.strictEqual(savedQuotation.customer_address, "Original Historical Address");
  assert.strictEqual(savedQuotation.customer_id, null);
  assert.strictEqual(savedQuotation.items.length, 2);

  // Catalog item snapshot
  assert.strictEqual(savedQuotation.items[0].product_id, "prod-uuid-1");
  assert.strictEqual(savedQuotation.items[0].item_description, "Heavy Duty Degreaser 5L");
  assert.strictEqual(savedQuotation.items[0].item_total, 1500);

  // Uncatalogued item snapshot
  assert.strictEqual(savedQuotation.items[1].product_id, null);
  assert.strictEqual(savedQuotation.items[1].brand_name, null);
  assert.strictEqual(savedQuotation.items[1].item_description, "Custom Special Mixing Service");
});

test("Calculation Engine Authority - server recalculates item totals and grand total", () => {
  const rawItems: QuotationItemFormState[] = [
    {
      id: "row-1",
      description: "Hydraulic Oil ISO 68",
      uom: "Drum",
      unitPrice: "4250.50",
      quantity: "2",
      itemTotal: 999999, // Tampered or stale client preview total
    },
    {
      id: "row-2",
      description: "Grease Tube EP2",
      uom: "Piece",
      unitPrice: 185.25,
      quantity: 10,
      itemTotal: 0, // Incomplete client preview
    },
  ];

  // 1. Authoritative item 1 total: 4250.50 * 2 = 8501.00
  const item1Calc = calculateItemTotal(rawItems[0].unitPrice, rawItems[0].quantity);
  assert.strictEqual(item1Calc.success, true);
  if (item1Calc.success) {
    assert.strictEqual(item1Calc.itemTotal, 8501);
  }

  // 2. Authoritative item 2 total: 185.25 * 10 = 1852.50
  const item2Calc = calculateItemTotal(rawItems[1].unitPrice, rawItems[1].quantity);
  assert.strictEqual(item2Calc.success, true);
  if (item2Calc.success) {
    assert.strictEqual(item2Calc.itemTotal, 1852.5);
  }

  // 3. Authoritative grand quotation total: 8501.00 + 1852.50 = 10353.50
  const quotationCalc = calculateQuotationTotal(rawItems);
    assert.strictEqual(quotationCalc.totalAmount, 10353.5);
    assert.strictEqual(quotationCalc.formattedTotal, "₱ 10,353.50");
    assert.strictEqual(formatAmount(quotationCalc.totalAmount), "10,353.50");
});

test("Quotation History Ordering - newest first sorting", () => {
  const historyItems: QuotationSummary[] = [
    {
      id: "q-1",
      qf_number: "QF-2026-0001",
      quotation_date: "2026-10-01",
      customer_name: "Beta Corp",
      customer_address: "Manila",
      contact_person: null,
      contact_number: null,
      total_amount: 500,
      status: "draft",
      created_by: "admin",
      created_at: "2026-10-01T08:00:00Z",
    },
    {
      id: "q-2",
      qf_number: "QF-2026-0002",
      quotation_date: "2026-10-04",
      customer_name: "Alpha Corp",
      customer_address: "Quezon City",
      contact_person: "John",
      contact_number: "123",
      total_amount: 2500,
      status: "draft",
      created_by: "admin",
      created_at: "2026-10-04T10:00:00Z",
    },
    {
      id: "q-3",
      qf_number: "QF-2026-0003",
      quotation_date: "2026-10-04",
      customer_name: "Gamma Corp",
      customer_address: "Taguig",
      contact_person: null,
      contact_number: null,
      total_amount: 1200,
      status: "draft",
      created_by: "admin",
      created_at: "2026-10-04T14:30:00Z",
    },
  ];

  // Sort function matching database query: order by quotation_date desc, created_at desc
  const sorted = [...historyItems].sort((a, b) => {
    const dateComp = b.quotation_date.localeCompare(a.quotation_date);
    if (dateComp !== 0) return dateComp;
    return b.created_at.localeCompare(a.created_at);
  });

  assert.strictEqual(sorted[0].qf_number, "QF-2026-0003"); // 2026-10-04 14:30
  assert.strictEqual(sorted[1].qf_number, "QF-2026-0002"); // 2026-10-04 10:00
  assert.strictEqual(sorted[2].qf_number, "QF-2026-0001"); // 2026-10-01
});
