"use server";

import { revalidatePath } from "next/cache";
import { createProduct, updateProduct, deleteProduct } from "@/lib/catalog/products";
import { getSession } from "@/lib/auth";

export interface ProductActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createProductAction(
  _prevState: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const name = formData.get("name")?.toString() || "";
  const description = formData.get("description")?.toString() || "";
  const brand_id = formData.get("brand_id")?.toString() || null;
  const default_uom_id = formData.get("default_uom_id")?.toString() || null;

  const result = await createProduct({
    name,
    description: description || null,
    brand_id: brand_id && brand_id !== "" ? brand_id : null,
    default_uom_id: default_uom_id && default_uom_id !== "" ? default_uom_id : null,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/products");
  return { success: true };
}

export async function updateProductAction(
  _prevState: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const id = formData.get("id")?.toString() || "";
  const name = formData.get("name")?.toString() || "";
  const description = formData.get("description")?.toString() || "";
  const brand_id = formData.get("brand_id")?.toString() || null;
  const default_uom_id = formData.get("default_uom_id")?.toString() || null;

  if (!id) {
    return { success: false, error: "Product ID is required." };
  }

  const result = await updateProduct(id, {
    name,
    description: description || null,
    brand_id: brand_id && brand_id !== "" ? brand_id : null,
    default_uom_id: default_uom_id && default_uom_id !== "" ? default_uom_id : null,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/products");
  return { success: true };
}

export async function deleteProductAction(id: string): Promise<ProductActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!id) {
    return { success: false, error: "Product ID is required." };
  }

  const result = await deleteProduct(id);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/products");
  return { success: true };
}
