import { supabase } from "@/lib/supabase";
import type {
  Brand,
  BrandLookupResult,
  CreateBrandInput,
  UpdateBrandInput,
} from "@/types/catalog";
import {
  validateBrandName,
  validateSearchQuery,
  sanitizeSearchQuery,
} from "@/lib/validations/catalog";

/**
 * Searches brands for autocomplete lookups.
 * Case-insensitive, partial-match, trimmed, database-backed, and limited.
 */
export async function searchBrands(
  query: string,
  limit = 10
): Promise<BrandLookupResult[]> {
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
    .from("brands")
    .select("id, name")
    .ilike("name", `%${sanitized}%`)
    .order("name", { ascending: true })
    .limit(safeLimit);

  if (error) {
    console.error("Error searching brands:", error);
    return [];
  }

  return (data || []).map((b) => ({
    id: b.id,
    name: b.name,
  }));
}

export async function listBrands(search?: string): Promise<Brand[]> {
  let query = supabase.from("brands").select("*").order("name", { ascending: true });

  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching brands:", error);
    return [];
  }

  return data as Brand[];
}

export async function getBrandById(id: string): Promise<Brand | null> {
  const { data, error } = await supabase.from("brands").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    return null;
  }
  return data as Brand;
}

export async function createBrand(
  input: CreateBrandInput
): Promise<{ success: boolean; data?: Brand; error?: string }> {
  const validation = validateBrandName(input.name);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error };
  }

  const name = validation.data.name;

  // Case-insensitive duplicate check
  const { data: existing } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Brand "${name}" already exists.` };
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({ name })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || "Failed to create brand." };
  }

  return { success: true, data: data as Brand };
}

export async function updateBrand(
  id: string,
  input: UpdateBrandInput
): Promise<{ success: boolean; data?: Brand; error?: string }> {
  const validation = validateBrandName(input.name);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error };
  }

  const name = validation.data.name;

  // Case-insensitive duplicate check excluding self
  const { data: existing } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", name)
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Another brand with the name "${name}" already exists.` };
  }

  const { data, error } = await supabase
    .from("brands")
    .update({ name })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || "Failed to update brand." };
  }

  return { success: true, data: data as Brand };
}

export async function deleteBrand(id: string): Promise<{ success: boolean; error?: string }> {
  // Safe deletion check: Verify if any products reference this brand
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id);

  if (countError) {
    return { success: false, error: "Failed to verify brand references." };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete brand: It is currently assigned to ${count} product(s). Please reassign those products first.`,
    };
  }

  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message || "Failed to delete brand." };
  }

  return { success: true };
}
