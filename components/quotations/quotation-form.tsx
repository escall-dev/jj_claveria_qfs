"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { QuotationFormState, QuotationItemFormState } from "@/types/quotation";
import type { UomLookupResult } from "@/types/catalog";
import {
  validateQuotationForm,
  type QuotationFormValidationResult,
} from "@/lib/validations/quotation";
import { QuotationItemRow } from "./quotation-item-row";

/**
 * Creates a new empty quotation line item with a stable unique ID.
 */
function createEmptyRow(): QuotationItemFormState {
  const stableId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id: stableId,
    productId: null,
    description: "",
    brandId: null,
    brandName: "",
    uom: "",
    unitPrice: "",
    quantity: "1",
    itemTotal: null,
  };
}

export interface QuotationFormProps {
  /** Pre-fetched active Units of Measure from server component */
  initialUoms: UomLookupResult[];
  /** Logged-in user information */
  currentUser?: {
    displayName: string;
    username: string;
  };
}

export function QuotationForm({ initialUoms, currentUser }: QuotationFormProps) {
  // Initial quotation state starting with 1 empty item row
  const [formData, setFormData] = useState<QuotationFormState>({
    date: new Date().toISOString().split("T")[0],
    qfNumber: "",
    companyName: "",
    companyAddress: "",
    contactPerson: "",
    contactNumber: "",
    items: [createEmptyRow()],
  });

  const [validationResult, setValidationResult] =
    useState<QuotationFormValidationResult | null>(null);
  const [validatedNotice, setValidatedNotice] = useState<string | null>(null);

  // Field change handlers for header/company details
  const handleFieldChange = (
    field: keyof Omit<QuotationFormState, "items">,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (validationResult?.fieldErrors?.[field]) {
      setValidationResult((prev) => {
        if (!prev) return null;
        const newFieldErrors = { ...prev.fieldErrors };
        delete newFieldErrors[field];
        return { ...prev, fieldErrors: newFieldErrors };
      });
    }

    if (validatedNotice) {
      setValidatedNotice(null);
    }
  };

  // Add Item row handler
  const handleAddItem = () => {
    const newRow = createEmptyRow();
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newRow],
    }));

    if (validatedNotice) {
      setValidatedNotice(null);
    }
  };

  // Remove Item row handler
  const handleRemoveItem = (id: string) => {
    setFormData((prev) => {
      if (prev.items.length <= 1) {
        return {
          ...prev,
          items: [createEmptyRow()],
        };
      }
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      };
    });

    if (validationResult?.itemErrors?.[id]) {
      setValidationResult((prev) => {
        if (!prev) return null;
        const newItemErrors = { ...prev.itemErrors };
        delete newItemErrors[id];
        return { ...prev, itemErrors: newItemErrors };
      });
    }

    if (validatedNotice) {
      setValidatedNotice(null);
    }
  };

  // Update Item row handler
  const handleUpdateItem = (
    id: string,
    updates: Partial<QuotationItemFormState>
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));

    if (validationResult?.itemErrors?.[id]) {
      setValidationResult((prev) => {
        if (!prev || !prev.itemErrors) return null;
        const rowErr = prev.itemErrors[id];
        if (!rowErr) return prev;

        const updatedRowErr = { ...rowErr };
        if (updates.description !== undefined) delete updatedRowErr.description;
        if (updates.uom !== undefined) delete updatedRowErr.uom;
        if (updates.unitPrice !== undefined) delete updatedRowErr.unitPrice;
        if (updates.quantity !== undefined) delete updatedRowErr.quantity;

        const newItemErrors = { ...prev.itemErrors, [id]: updatedRowErr };
        return { ...prev, itemErrors: newItemErrors };
      });
    }

    if (validatedNotice) {
      setValidatedNotice(null);
    }
  };

  // Save / Validate Attempt
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = validateQuotationForm(formData);
    setValidationResult(result);

    if (!result.success) {
      setValidatedNotice(null);
      return;
    }

    // Phase 9 Boundary: Form validation passed!
    setValidatedNotice(
      "Quotation form validated! Data entry and line items are verified. Database persistence (INSERT) is scheduled for Phase 11."
    );
  };

  // Quick UI estimation for subtotal preview (Phase 9 preview only)
  const estimatedSubtotal = formData.items.reduce((sum, item) => {
    const price = typeof item.unitPrice === "number" ? item.unitPrice : parseFloat(String(item.unitPrice || ""));
    const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity || ""));
    if (!isNaN(price) && !isNaN(qty) && price >= 0 && qty > 0) {
      return sum + price * qty;
    }
    return sum;
  }, 0);

  const errors = validationResult?.fieldErrors;

  return (
    <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col min-h-0 gap-2" noValidate>
      {/* Validation Status Notification */}
      {validationResult && !validationResult.success && (
        <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/60 px-3 py-1.5 text-xs text-red-800 dark:text-red-300 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold">
              {validationResult.error || "Please review the highlighted errors."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setValidationResult(null)}
            className="text-red-500 hover:text-red-700 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {validatedNotice && (
        <div className="rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{validatedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidatedNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: COMPACT HEADER (Title, Breadcrumbs, Date, QF#) */}
      <header className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-zinc-500">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/quotations" className="hover:underline">
              Quotations
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            New Quotation
          </h1>
          {currentUser && (
            <span className="hidden sm:inline-flex text-[11px] text-zinc-400 border-l border-zinc-200 dark:border-zinc-800 pl-2">
              By: <span className="font-medium text-zinc-600 dark:text-zinc-300 ml-1">{currentUser.displayName}</span>
            </span>
          )}
        </div>

        {/* Date & QF # Controls Inline */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Quotation Date */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="quotation-date"
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap"
            >
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="quotation-date"
              name="quotation_date"
              value={formData.date}
              onChange={(e) => handleFieldChange("date", e.target.value)}
              className={`h-8 rounded-md border ${
                errors?.date
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100`}
            />
          </div>

          {/* QF # */}
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="qf-number"
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 whitespace-nowrap"
            >
              QF # <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="qf-number"
              name="qf_number"
              value={formData.qfNumber}
              onChange={(e) => handleFieldChange("qfNumber", e.target.value)}
              placeholder="QF-2026-0001"
              autoComplete="off"
              className={`h-8 w-28 sm:w-36 rounded-md border ${
                errors?.qfNumber
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100`}
            />
          </div>
        </div>
      </header>

      {/* SECTION 2: COMPACT COMPANY DETAILS GRID */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 shadow-xs flex-shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Company Name */}
          <div>
            <label
              htmlFor="company-name"
              className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1"
            >
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="company-name"
              name="company_name"
              value={formData.companyName}
              onChange={(e) => handleFieldChange("companyName", e.target.value)}
              placeholder="e.g. ABC Industrial Corporation"
              className={`h-8 w-full rounded-md border ${
                errors?.companyName
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100`}
            />
          </div>

          {/* Company Address */}
          <div>
            <label
              htmlFor="company-address"
              className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1"
            >
              Company Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="company-address"
              name="company_address"
              value={formData.companyAddress}
              onChange={(e) => handleFieldChange("companyAddress", e.target.value)}
              placeholder="Street, City, Province"
              className={`h-8 w-full rounded-md border ${
                errors?.companyAddress
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100`}
            />
          </div>

          {/* Contact Person */}
          <div>
            <label
              htmlFor="contact-person"
              className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1"
            >
              Contact Person <span className="text-zinc-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              id="contact-person"
              name="contact_person"
              value={formData.contactPerson}
              onChange={(e) => handleFieldChange("contactPerson", e.target.value)}
              placeholder="e.g. Engr. Juan Dela Cruz"
              className="h-8 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Contact Number */}
          <div>
            <label
              htmlFor="contact-number"
              className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1"
            >
              Contact Number <span className="text-zinc-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              id="contact-number"
              name="contact_number"
              value={formData.contactNumber}
              onChange={(e) => handleFieldChange("contactNumber", e.target.value)}
              placeholder="e.g. +63 917 123 4567"
              className="h-8 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: ITEMS TABLE (Visual Dominance & Internal Scroll) */}
      <section className="flex-1 min-h-[240px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Quotation Items
            </h2>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {formData.items.length} {formData.items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 rounded bg-zinc-900 dark:bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Item
          </button>
        </div>

        {/* Scrollable table container */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse min-w-[860px]">
            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800/95 backdrop-blur-xs z-10 border-b border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-500 uppercase tracking-wider shadow-xs">
              <tr>
                <th scope="col" className="py-1.5 px-1.5 text-center w-10">
                  #
                </th>
                <th scope="col" className="py-1.5 px-1.5 min-w-[260px]">
                  Item Description <span className="text-red-500">*</span>
                </th>
                <th scope="col" className="py-1.5 px-1.5 min-w-[150px]">
                  Brand
                </th>
                <th scope="col" className="py-1.5 px-1.5 min-w-[120px]">
                  UOM <span className="text-red-500">*</span>
                </th>
                <th scope="col" className="py-1.5 px-1.5 min-w-[110px]">
                  Unit Price <span className="text-red-500">*</span>
                </th>
                <th scope="col" className="py-1.5 px-1.5 min-w-[80px]">
                  Qty <span className="text-red-500">*</span>
                </th>
                <th scope="col" className="py-1.5 px-2 min-w-[100px] text-right">
                  Item Total
                </th>
                <th scope="col" className="py-1.5 px-1 text-center w-10">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {formData.items.map((item, index) => (
                <QuotationItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  availableUoms={initialUoms}
                  errors={validationResult?.itemErrors?.[item.id]}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                  canRemove={formData.items.length > 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 4: STICKY BOTTOM ACTION BAR */}
      <footer className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 shadow-xs flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link
            href="/quotations"
            className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium ml-2"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Row
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
              Subtotal Preview:
            </span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              ₱ {estimatedSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded bg-zinc-900 dark:bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            <span>Save Quotation</span>
            <span className="rounded bg-zinc-700 dark:bg-zinc-300 px-1 py-0.2 text-[9px] uppercase font-bold text-zinc-200 dark:text-zinc-800">
              Phase 11
            </span>
          </button>
        </div>
      </footer>
    </form>
  );
}
