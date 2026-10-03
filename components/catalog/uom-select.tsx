"use client";

import React, { useState, useEffect } from "react";
import type { UomLookupResult } from "@/types/catalog";
import { getActiveUomsAction } from "./actions";

export interface UomSelectProps {
  /** Currently selected UOM value (name, abbreviation, or ID) */
  value: string;
  /** Callback fired when a UOM is selected */
  onChange: (value: string, uom?: UomLookupResult) => void;
  /** Optional pre-fetched list of active UOMs (avoids extra fetch if provided) */
  availableUoms?: UomLookupResult[];
  /** Optional placeholder option label */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required attribute */
  required?: boolean;
  /** HTML select id */
  id?: string;
  /** HTML select name */
  name?: string;
  /** Additional CSS class names */
  className?: string;
}

export function UomSelect({
  value,
  onChange,
  availableUoms,
  placeholder = "Select Unit (UOM)...",
  disabled = false,
  required = false,
  id = "uom-select",
  name = "uom",
  className = "",
}: UomSelectProps) {
  const [uoms, setUoms] = useState<UomLookupResult[]>(availableUoms || []);
  const [isLoading, setIsLoading] = useState(!availableUoms || availableUoms.length === 0);

  // If availableUoms was not passed, load active UOMs from server action
  useEffect(() => {
    if (availableUoms && availableUoms.length > 0) {
      setUoms(availableUoms);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getActiveUomsAction()
      .then((res) => {
        if (isMounted && res.success) {
          setUoms(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load active UOMs:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [availableUoms]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    const matchedUom = uoms.find(
      (u) =>
        u.id === selectedVal ||
        u.name.toLowerCase() === selectedVal.toLowerCase() ||
        (u.abbreviation && u.abbreviation.toLowerCase() === selectedVal.toLowerCase())
    );

    onChange(selectedVal, matchedUom);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        required={required}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-50 appearance-none pr-8 cursor-pointer"
      >
        <option value="" disabled={required}>
          {isLoading ? "Loading units of measure..." : placeholder}
        </option>
        {uoms.map((uom) => (
          <option key={uom.id} value={uom.abbreviation || uom.name}>
            {uom.name}
            {uom.abbreviation ? ` (${uom.abbreviation})` : ""}
          </option>
        ))}
      </select>

      {/* Dropdown chevron icon */}
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
