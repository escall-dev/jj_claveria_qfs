"use server";

import { revalidatePath } from "next/cache";
import { createUom, updateUom, setUomActive } from "@/lib/catalog/uoms";
import { getSession } from "@/lib/auth";

export interface UomActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createUomAction(
  _prevState: UomActionResult | null,
  formData: FormData
): Promise<UomActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const name = formData.get("name")?.toString() || "";
  const abbreviation = formData.get("abbreviation")?.toString() || "";

  const result = await createUom({ name, abbreviation });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/uoms");
  revalidatePath("/catalog/products");
  return { success: true };
}

export async function updateUomAction(
  _prevState: UomActionResult | null,
  formData: FormData
): Promise<UomActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const id = formData.get("id")?.toString() || "";
  const name = formData.get("name")?.toString() || "";
  const abbreviation = formData.get("abbreviation")?.toString() || "";

  if (!id) {
    return { success: false, error: "UOM ID is required." };
  }

  const result = await updateUom(id, { name, abbreviation });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/uoms");
  revalidatePath("/catalog/products");
  return { success: true };
}

export async function toggleUomActiveAction(
  id: string,
  currentActive: boolean
): Promise<UomActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  if (!id) {
    return { success: false, error: "UOM ID is required." };
  }

  const result = await setUomActive(id, !currentActive);
  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/catalog/uoms");
  revalidatePath("/catalog/products");
  return { success: true };
}
