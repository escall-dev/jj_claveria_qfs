"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ProductLookupResult } from "@/types/catalog";
import { searchProductsAction } from "./actions";

export interface ProductAutocompleteProps {
  /** Current text value in the input (item description / product name) */
  value: string;
  /** Callback fired when the input text changes */
  onChange: (value: string) => void;
  /** Callback fired when an existing catalog product is selected */
  onSelectProduct?: (product: ProductLookupResult) => void;
  /** Callback fired when a previous product link is cleared / text is modified */
  onClearSelection?: () => void;
  /** Currently selected product ID (if catalog-linked) */
  selectedProductId?: string | null;
  /** Custom input placeholder */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required state */
  required?: boolean;
  /** HTML input id */
  id?: string;
  /** HTML input name */
  name?: string;
  /** Additional CSS class names for the outer container */
  className?: string;
  /** Max results limit for lookup */
  limit?: number;
}

export function ProductAutocomplete({
  value,
  onChange,
  onSelectProduct,
  onClearSelection,
  selectedProductId,
  placeholder = "Search catalog or enter item description...",
  disabled = false,
  required = false,
  id = "product-autocomplete",
  name = "item_description",
  className = "",
  limit = 10,
}: ProductAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductLookupResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search execution
  const executeSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSuggestions([]);
        setIsLoading(false);
        setIsOpen(false);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await searchProductsAction(trimmed, limit);
        if (response.success) {
          setSuggestions(response.data);
          setIsOpen(true);
          setHighlightedIndex(-1);
          setHasSearched(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Error searching products:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  // Handle typing input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // If an existing product was previously selected and user modifies the text,
    // notify parent that it is now custom/unlinked
    if (selectedProductId && onClearSelection) {
      onClearSelection();
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!newValue.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(newValue);
    }, 250);
  };

  // Handle selecting a product from suggestions
  const handleSelect = (product: ProductLookupResult) => {
    onChange(product.name);
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-suggestions`}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50 pr-8"
        />

        {/* Status indicator: spinner or catalog badge */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {isLoading && (
            <svg
              className="animate-spin h-4 w-4 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Loading"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          {!isLoading && selectedProductId && (
            <span
              title="Linked to catalog product"
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
            >
              Catalog
            </span>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg text-sm"
        >
          {suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((product, index) => {
                const isHighlighted = highlightedIndex === index;
                return (
                  <li
                    key={product.id}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(product)}
                    className={`cursor-pointer px-3 py-2 transition-colors ${
                      isHighlighted
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {product.name}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {product.brand && (
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {product.brand.name}
                          </span>
                        )}
                        {product.default_uom && (
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            {product.default_uom.abbreviation || product.default_uom.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {product.description && (
                      <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                        {product.description}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : hasSearched && !isLoading ? (
            <div className="p-3 text-xs text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                No matching catalog products found.
              </p>
              <p className="text-[11px] text-zinc-400">
                You can continue typing to use a custom item description without saving to the catalog.
              </p>
            </div>
          ) : null}

          {/* Quick keyboard navigation hint */}
          {suggestions.length > 0 && (
            <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-1 text-[10px] text-zinc-400 flex items-center justify-between">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
