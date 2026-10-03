import { supabase } from "@/lib/supabase";
import type {
  Product,
  ProductWithRelations,
  CreateProductInput,
  UpdateProductInput,
} from "@/types/catalog";
import { validateProductInput } from "@/lib/validations/catalog";

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
