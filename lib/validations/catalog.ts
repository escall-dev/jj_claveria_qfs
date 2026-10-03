/**
 * Server-side Validation Logic for Catalog Entities (Brands, UOMs, Products).
 */

export interface ValidationOutput<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateBrandName(nameRaw: unknown): ValidationOutput<{ name: string }> {
  if (typeof nameRaw !== "string") {
    return { success: false, error: "Brand name must be provided.", fieldErrors: { name: ["Brand name is required."] } };
  }

  const name = nameRaw.trim();
  if (!name) {
    return { success: false, error: "Brand name cannot be empty.", fieldErrors: { name: ["Brand name cannot be empty."] } };
  }

  if (name.length > 100) {
    return { success: false, error: "Brand name cannot exceed 100 characters.", fieldErrors: { name: ["Brand name cannot exceed 100 characters."] } };
  }

  return { success: true, data: { name } };
}

export function validateUomInput(
  nameRaw: unknown,
  abbreviationRaw?: unknown
): ValidationOutput<{ name: string; abbreviation: string | null }> {
  if (typeof nameRaw !== "string") {
    return { success: false, error: "UOM name must be provided.", fieldErrors: { name: ["UOM name is required."] } };
  }

  const name = nameRaw.trim();
  if (!name) {
    return { success: false, error: "UOM name cannot be empty.", fieldErrors: { name: ["UOM name cannot be empty."] } };
  }

  if (name.length > 50) {
    return { success: false, error: "UOM name cannot exceed 50 characters.", fieldErrors: { name: ["UOM name cannot exceed 50 characters."] } };
  }

  let abbreviation: string | null = null;
  if (typeof abbreviationRaw === "string") {
    const trimmed = abbreviationRaw.trim();
    if (trimmed.length > 20) {
      return { success: false, error: "Abbreviation cannot exceed 20 characters.", fieldErrors: { abbreviation: ["Abbreviation cannot exceed 20 characters."] } };
    }
    abbreviation = trimmed || null;
  }

  return { success: true, data: { name, abbreviation } };
}

export function validateProductInput(
  nameRaw: unknown,
  descriptionRaw?: unknown,
  brandIdRaw?: unknown,
  defaultUomIdRaw?: unknown
): ValidationOutput<{
  name: string;
  description: string | null;
  brand_id: string | null;
  default_uom_id: string | null;
}> {
  if (typeof nameRaw !== "string") {
    return { success: false, error: "Product name must be provided.", fieldErrors: { name: ["Product name is required."] } };
  }

  const name = nameRaw.trim();
  if (!name) {
    return { success: false, error: "Product name cannot be empty.", fieldErrors: { name: ["Product name cannot be empty."] } };
  }

  if (name.length > 200) {
    return { success: false, error: "Product name cannot exceed 200 characters.", fieldErrors: { name: ["Product name cannot exceed 200 characters."] } };
  }

  let description: string | null = null;
  if (typeof descriptionRaw === "string") {
    const trimmed = descriptionRaw.trim();
    description = trimmed || null;
  }

  let brand_id: string | null = null;
  if (typeof brandIdRaw === "string" && brandIdRaw.trim() !== "") {
    const trimmed = brandIdRaw.trim();
    if (!UUID_REGEX.test(trimmed)) {
      return { success: false, error: "Invalid Brand ID selected.", fieldErrors: { brand_id: ["Invalid Brand selected."] } };
    }
    brand_id = trimmed;
  }

  let default_uom_id: string | null = null;
  if (typeof defaultUomIdRaw === "string" && defaultUomIdRaw.trim() !== "") {
    const trimmed = defaultUomIdRaw.trim();
    if (!UUID_REGEX.test(trimmed)) {
      return { success: false, error: "Invalid UOM ID selected.", fieldErrors: { default_uom_id: ["Invalid UOM selected."] } };
    }
    default_uom_id = trimmed;
  }

  return {
    success: true,
    data: { name, description, brand_id, default_uom_id },
  };
}

/**
 * Validates search query input for catalog lookups.
 * Enforces string type, trims whitespace, and limits max query length.
 */
export function validateSearchQuery(
  queryRaw: unknown,
  maxLength = 100
): ValidationOutput<{ query: string }> {
  if (typeof queryRaw !== "string") {
    return {
      success: false,
      error: "Search query must be a string.",
      fieldErrors: { query: ["Invalid query format."] },
    };
  }

  const query = queryRaw.trim();
  if (query.length > maxLength) {
    return {
      success: false,
      error: `Search query cannot exceed ${maxLength} characters.`,
      fieldErrors: { query: [`Query exceeds maximum length of ${maxLength}.`] },
    };
  }

  return { success: true, data: { query } };
}

/**
 * Safely sanitizes search query for SQL/PostgREST ilike pattern matching.
 * Escapes %, _, and \ characters to prevent regex/wildcard injection.
 */
export function sanitizeSearchQuery(query: string): string {
  return query.replace(/[%_\\]/g, "\\$&");
}
