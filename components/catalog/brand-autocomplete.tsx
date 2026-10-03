"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { BrandLookupResult } from "@/types/catalog";
import { searchBrandsAction } from "./actions";

export interface BrandAutocompleteProps {
  /** Current text value of brand name */
  value: string;
  /** Callback fired when the input text changes */
  onChange: (value: string) => void;
  /** Callback fired when an existing catalog brand is selected */
  onSelectBrand?: (brand: BrandLookupResult) => void;
  /** Callback fired when a brand link is cleared / modified */
  onClearSelection?: () => void;
  /** Selected brand ID (if catalog-linked) */
  selectedBrandId?: string | null;
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

export function BrandAutocomplete({
  value,
  onChange,
  onSelectBrand,
  onClearSelection,
  selectedBrandId,
  placeholder = "Search brand or enter custom brand...",
  disabled = false,
  required = false,
  id = "brand-autocomplete",
  name = "brand_name",
  className = "",
  limit = 10,
}: BrandAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BrandLookupResult[]>([]);
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

  // Debounced brand search execution
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
        const response = await searchBrandsAction(trimmed, limit);
        if (response.success) {
          setSuggestions(response.data);
          setIsOpen(true);
          setHighlightedIndex(-1);
          setHasSearched(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Error searching brands:", err);
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

    if (selectedBrandId && onClearSelection) {
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

  // Handle selecting a brand from suggestions
  const handleSelect = (brand: BrandLookupResult) => {
    onChange(brand.name);
    if (onSelectBrand) {
      onSelectBrand(brand);
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

          {!isLoading && selectedBrandId && (
            <span
              title="Linked to catalog brand"
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
            >
              Brand
            </span>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg text-sm"
        >
          {suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((brand, index) => {
                const isHighlighted = highlightedIndex === index;
                return (
                  <li
                    key={brand.id}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(brand)}
                    className={`cursor-pointer px-3 py-2 transition-colors flex items-center justify-between ${
                      isHighlighted
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {brand.name}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Catalog Brand
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : hasSearched && !isLoading ? (
            <div className="p-3 text-xs text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                No matching brands in catalog.
              </p>
              <p className="text-[11px] text-zinc-400">
                You can keep typing to use a custom brand without creating a catalog record.
              </p>
            </div>
          ) : null}

          {/* Quick keyboard hint */}
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
