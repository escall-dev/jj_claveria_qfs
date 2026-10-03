"use client";

import React from "react";
import type { QuotationItemFormState } from "@/types/quotation";
import type { UomLookupResult, ProductLookupResult, BrandLookupResult } from "@/types/catalog";
import type { QuotationRowError } from "@/lib/validations/quotation";
import { ProductAutocomplete } from "@/components/catalog/product-autocomplete";
import { BrandAutocomplete } from "@/components/catalog/brand-autocomplete";
import { UomSelect } from "@/components/catalog/uom-select";

export interface QuotationItemRowProps {
  /** The item row state */
  item: QuotationItemFormState;
  /** Visible display index (0-indexed) */
  index: number;
  /** Active UOMs list passed down from parent */
  availableUoms?: UomLookupResult[];
  /** Validation errors for this specific row */
  errors?: QuotationRowError;
  /** Update callback */
  onUpdate: (id: string, updates: Partial<QuotationItemFormState>) => void;
  /** Remove callback */
  onRemove: (id: string) => void;
  /** Whether the row can be removed (false if only 1 row) */
  canRemove: boolean;
}

export function QuotationItemRow({
  item,
  index,
  availableUoms,
  errors,
  onUpdate,
  onRemove,
  canRemove,
}: QuotationItemRowProps) {
  // Product Autocomplete handlers
  const handleSelectProduct = (product: ProductLookupResult) => {
    const defaultUom = product.default_uom?.abbreviation || product.default_uom?.name || "";
    onUpdate(item.id, {
      description: product.name,
      productId: product.id,
      brandName: product.brand?.name || item.brandName || "",
      brandId: product.brand?.id || null,
      uom: defaultUom || item.uom,
    });
  };

  const handleProductTextChange = (value: string) => {
    onUpdate(item.id, {
      description: value,
      productId: null,
    });
  };

  const handleClearProductSelection = () => {
    onUpdate(item.id, { productId: null });
  };

  // Brand Autocomplete handlers
  const handleSelectBrand = (brand: BrandLookupResult) => {
    onUpdate(item.id, {
      brandName: brand.name,
      brandId: brand.id,
    });
  };

  const handleBrandTextChange = (value: string) => {
    onUpdate(item.id, {
      brandName: value,
      brandId: null,
    });
  };

  const handleClearBrandSelection = () => {
    onUpdate(item.id, { brandId: null });
  };

  // Price & Quantity numeric parsing for Phase 9 UI placeholder/preview
  const priceNum = typeof item.unitPrice === "number" ? item.unitPrice : parseFloat(String(item.unitPrice || ""));
  const qtyNum = typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity || ""));
  const hasValidPrice = !isNaN(priceNum) && priceNum >= 0 && item.unitPrice !== "";
  const hasValidQty = !isNaN(qtyNum) && qtyNum > 0 && item.quantity !== "";

  // Temporary UI preview for Phase 9 (Authoritative calculation domain engine is in Phase 10)
  const previewTotal = hasValidPrice && hasValidQty
    ? `₱ ${(priceNum * qtyNum).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/60 transition-colors">
      {/* 1. Item # */}
      <td className="py-1 px-1.5 text-center text-xs font-semibold text-zinc-400 select-none align-middle w-10">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
          {index + 1}
        </span>
      </td>

      {/* 2. Item Description (Product Autocomplete or Manual) */}
      <td className="py-1 px-1.5 min-w-[260px] align-middle">
        <div className="relative">
          <ProductAutocomplete
            id={`product-desc-${item.id}`}
            name={`items[${index}].description`}
            value={item.description}
            onChange={handleProductTextChange}
            onSelectProduct={handleSelectProduct}
            onClearSelection={handleClearProductSelection}
            selectedProductId={item.productId}
            placeholder="Search catalog or type description..."
            inputClassName={`h-8 px-2.5 py-1 text-xs ${
              errors?.description ? "border-red-500 ring-1 ring-red-500" : ""
            }`}
          />
          {errors?.description && (
            <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400 leading-tight">
              {errors.description[0]}
            </p>
          )}
        </div>
      </td>

      {/* 3. Brand (Brand Autocomplete or Manual) */}
      <td className="py-1 px-1.5 min-w-[150px] align-middle">
        <BrandAutocomplete
          id={`brand-name-${item.id}`}
          name={`items[${index}].brand`}
          value={item.brandName || ""}
          onChange={handleBrandTextChange}
          onSelectBrand={handleSelectBrand}
          onClearSelection={handleClearBrandSelection}
          selectedBrandId={item.brandId}
          placeholder="Brand (optional)..."
          inputClassName="h-8 px-2.5 py-1 text-xs"
        />
      </td>

      {/* 4. Unit of Measure (UOM) */}
      <td className="py-1 px-1.5 min-w-[120px] align-middle">
        <div>
          <UomSelect
            id={`uom-${item.id}`}
            name={`items[${index}].uom`}
            value={item.uom}
            onChange={(val) => onUpdate(item.id, { uom: val })}
            availableUoms={availableUoms}
            placeholder="Select UOM..."
            selectClassName={`h-8 px-2 py-1 text-xs ${
              errors?.uom ? "border-red-500 ring-1 ring-red-500" : ""
            }`}
          />
          {errors?.uom && (
            <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400 leading-tight">
              {errors.uom[0]}
            </p>
          )}
        </div>
      </td>

      {/* 5. Unit Price */}
      <td className="py-1 px-1.5 min-w-[110px] align-middle">
        <div>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 pointer-events-none select-none">
              ₱
            </span>
            <input
              type="number"
              min="0"
              step="any"
              id={`unit-price-${item.id}`}
              name={`items[${index}].unit_price`}
              value={item.unitPrice}
              onChange={(e) => onUpdate(item.id, { unitPrice: e.target.value })}
              placeholder="0.00"
              className={`h-8 w-full rounded-md border ${
                errors?.unitPrice
                  ? "border-red-500 ring-1 ring-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              } bg-white dark:bg-zinc-900 pl-5 pr-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100`}
            />
          </div>
          {errors?.unitPrice && (
            <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400 leading-tight">
              {errors.unitPrice[0]}
            </p>
          )}
        </div>
      </td>

      {/* 6. Quantity */}
      <td className="py-1 px-1.5 min-w-[80px] align-middle">
        <div>
          <input
            type="number"
            min="0.001"
            step="any"
            id={`quantity-${item.id}`}
            name={`items[${index}].quantity`}
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, { quantity: e.target.value })}
            placeholder="1"
            className={`h-8 w-full rounded-md border ${
              errors?.quantity
                ? "border-red-500 ring-1 ring-red-500"
                : "border-zinc-300 dark:border-zinc-700"
            } bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100`}
          />
          {errors?.quantity && (
            <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400 leading-tight">
              {errors.quantity[0]}
            </p>
          )}
        </div>
      </td>

      {/* 7. Item Total (Phase 9 placeholder / preview) */}
      <td className="py-1 px-2 min-w-[100px] text-right font-medium text-xs text-zinc-700 dark:text-zinc-300 align-middle">
        <span
          title="Phase 9 UI preview. Authoritative calculation engine will be enabled in Phase 10."
          className="cursor-help"
        >
          {previewTotal}
        </span>
      </td>

      {/* 8. Action (Remove row) */}
      <td className="py-1 px-1 text-center w-10 align-middle">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={!canRemove}
          title={canRemove ? "Remove item" : "At least one item is required"}
          aria-label={`Remove item ${index + 1}`}
          className={`p-1 rounded transition-colors ${
            canRemove
              ? "text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-40"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}
