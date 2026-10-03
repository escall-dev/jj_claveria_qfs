"use server";

import { revalidatePath } from "next/cache";
import { createBrand, updateBrand, deleteBrand } from "@/lib/catalog/brands";
import { getSession } from "@/lib/auth";

export interface BrandActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createBrandAction(
  _prevState: BrandActionResult | null,
  formData: FormData
): Promise<BrandActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const name = formData.get("name")?.toString() || "";
  const result = await createBrand({ name });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/brands");
  revalidatePath("/catalog/products");
  return { success: true };
}

export async function updateBrandAction(
  _prevState: BrandActionResult | null,
  formData: FormData
): Promise<BrandActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const id = formData.get("id")?.toString() || "";
  const name = formData.get("name")?.toString() || "";

  if (!id) {
    return { success: false, error: "Brand ID is required." };
  }

  const result = await updateBrand(id, { name });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/brands");
  revalidatePath("/catalog/products");
  return { success: true };
}

export async function deleteBrandAction(id: string): Promise<BrandActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!id) {
    return { success: false, error: "Brand ID is required." };
  }

  const result = await deleteBrand(id);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/brands");
  revalidatePath("/catalog/products");
  return { success: true };
}
