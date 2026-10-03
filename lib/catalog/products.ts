import { supabase } from "@/lib/supabase";
import type {
  Product,
  ProductWithRelations,
  ProductLookupResult,
  CreateProductInput,
  UpdateProductInput,
} from "@/types/catalog";
import {
  validateProductInput,
  validateSearchQuery,
  sanitizeSearchQuery,
} from "@/lib/validations/catalog";

/**
 * Searches products for autocomplete lookups.
 * Case-insensitive, partial-match, trimmed, database-backed, and limited.
 * Resolves brand and default UOM relations.
 */
export async function searchProducts(
  query: string,
  limit = 10
): Promise<ProductLookupResult[]> {
  const validation = validateSearchQuery(query);
  if (!validation.success || !validation.data) {
    return [];
  }

  const trimmedQuery = validation.data.query;
  if (!trimmedQuery) {
    return [];
  }

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const sanitized = sanitizeSearchQuery(trimmedQuery);

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      brand_id,
      default_uom_id,
      brand:brands(id, name),
      default_uom:uoms(id, name, abbreviation, active)
    `)
    .ilike("name", `%${sanitized}%`)
    .order("name", { ascending: true })
    .limit(safeLimit);

  if (error) {
    console.error("Error searching products:", error);
    return [];
  }

  if (!data) {
    return [];
  }

  interface RawProductRecord {
    id: string;
    name: string;
    description: string | null;
    brand_id: string | null;
    default_uom_id: string | null;
    brand: { id: string; name: string } | { id: string; name: string }[] | null;
    default_uom:
      | { id: string; name: string; abbreviation: string | null; active: boolean }
      | { id: string; name: string; abbreviation: string | null; active: boolean }[]
      | null;
  }

  return (data as unknown as RawProductRecord[]).map((item) => {
    const brandData = Array.isArray(item.brand) ? item.brand[0] : item.brand;
    const uomData = Array.isArray(item.default_uom) ? item.default_uom[0] : item.default_uom;

    return {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      brand_id: item.brand_id ?? null,
      default_uom_id: item.default_uom_id ?? null,
      brand: brandData && item.brand_id
        ? {
            id: brandData.id,
            name: brandData.name,
          }
        : null,
      default_uom: uomData && item.default_uom_id
        ? {
            id: uomData.id,
            name: uomData.name,
            abbreviation: uomData.abbreviation ?? null,
            active: Boolean(uomData.active),
          }
        : null,
    };
  });
}

/**
 * Retrieves a single product with resolved brand and default UOM relations
 * formatted for the lookup layer.
 */
export async function getProductWithRelations(
  id: string
): Promise<ProductLookupResult | null> {
  if (!id || typeof id !== "string") {
    return null;
  }

  const trimmedId = id.trim();
  if (!trimmedId) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      brand_id,
      default_uom_id,
      brand:brands(id, name),
      default_uom:uoms(id, name, abbreviation, active)
    `)
    .eq("id", trimmedId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  interface RawProductRecord {
    id: string;
    name: string;
    description: string | null;
    brand_id: string | null;
    default_uom_id: string | null;
    brand: { id: string; name: string } | { id: string; name: string }[] | null;
    default_uom:
      | { id: string; name: string; abbreviation: string | null; active: boolean }
      | { id: string; name: string; abbreviation: string | null; active: boolean }[]
      | null;
  }

  const item = data as unknown as RawProductRecord;
  const brandData = Array.isArray(item.brand) ? item.brand[0] : item.brand;
  const uomData = Array.isArray(item.default_uom) ? item.default_uom[0] : item.default_uom;

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    brand_id: item.brand_id ?? null,
    default_uom_id: item.default_uom_id ?? null,
    brand: brandData && item.brand_id
      ? {
          id: brandData.id,
          name: brandData.name,
        }
      : null,
    default_uom: uomData && item.default_uom_id
      ? {
          id: uomData.id,
          name: uomData.name,
          abbreviation: uomData.abbreviation ?? null,
          active: Boolean(uomData.active),
        }
      : null,
  };
}

export async function listProducts(options?: {
  search?: string;
  brandId?: string;
}): Promise<ProductWithRelations[]> {
  let query = supabase
    .from("products")
    .select(`
      id,
      brand_id,
      name,
      description,
      default_uom_id,
      created_at,
      updated_at,
      brand:brands(id, name),
      default_uom:uoms(id, name, abbreviation, active)
    `)
    .order("name", { ascending: true });

  if (options?.brandId && options.brandId.trim()) {
    query = query.eq("brand_id", options.brandId.trim());
  }

  if (options?.search && options.search.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return (data || []) as unknown as ProductWithRelations[];
}

export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      brand_id,
      name,
      description,
      default_uom_id,
      created_at,
      updated_at,
      brand:brands(id, name),
      default_uom:uoms(id, name, abbreviation, active)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as unknown as ProductWithRelations;
}

export async function createProduct(
  input: CreateProductInput
): Promise<{ success: boolean; data?: Product; error?: string }> {
  const validation = validateProductInput(
    input.name,
    input.description,
    input.brand_id,
    input.default_uom_id
  );

  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error };
  }

  const { name, description, brand_id, default_uom_id } = validation.data;

  // Optional: check if brand exists if provided
  if (brand_id) {
    const { data: brandExists } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brand_id)
      .maybeSingle();

    if (!brandExists) {
      return { success: false, error: "Selected brand does not exist." };
    }
  }

  // Optional: check if UOM exists if provided
  if (default_uom_id) {
    const { data: uomExists } = await supabase
      .from("uoms")
      .select("id")
      .eq("id", default_uom_id)
      .maybeSingle();

    if (!uomExists) {
      return { success: false, error: "Selected unit of measure does not exist." };
    }
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      description,
      brand_id,
      default_uom_id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || "Failed to create product." };
  }

  return { success: true, data: data as Product };
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<{ success: boolean; data?: Product; error?: string }> {
  const validation = validateProductInput(
    input.name,
    input.description,
    input.brand_id,
    input.default_uom_id
  );

  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error };
  }

  const { name, description, brand_id, default_uom_id } = validation.data;

  if (brand_id) {
    const { data: brandExists } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brand_id)
      .maybeSingle();

    if (!brandExists) {
      return { success: false, error: "Selected brand does not exist." };
    }
  }

  if (default_uom_id) {
    const { data: uomExists } = await supabase
      .from("uoms")
      .select("id")
      .eq("id", default_uom_id)
      .maybeSingle();

    if (!uomExists) {
      return { success: false, error: "Selected unit of measure does not exist." };
    }
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name,
      description,
      brand_id,
      default_uom_id,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || "Failed to update product." };
  }

  return { success: true, data: data as Product };
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  // Historical Safety: Verify if this product is referenced by any quotation items
  const { count, error: countError } = await supabase
    .from("quotation_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (countError) {
    return { success: false, error: "Failed to verify quotation references for product." };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete product: It is referenced in ${count} historical quotation record(s). Historical quotations must be preserved.`,
    };
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message || "Failed to delete product." };
  }

  return { success: true };
}
