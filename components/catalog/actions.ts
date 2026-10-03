"use server";

import { getSession } from "@/lib/auth";
import {
  searchProducts,
  getProductWithRelations,
  searchBrands,
  listActiveUoms,
} from "@/lib/catalog";
import type {
  ProductLookupResult,
  BrandLookupResult,
  UomLookupResult,
} from "@/types/catalog";

/**
 * Server Action: Search products for autocomplete.
 * Protected by user session authentication.
 * Pure read-only lookup with zero catalog mutations.
 */
export async function searchProductsAction(
  query: string,
  limit = 10
): Promise<{ success: boolean; data: ProductLookupResult[]; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, data: [], error: "Unauthorized. Please log in." };
  }

  try {
    const data = await searchProducts(query, limit);
    return { success: true, data };
  } catch (error) {
    console.error("searchProductsAction failed:", error);
    return { success: false, data: [], error: "Failed to search catalog products." };
  }
}

/**
 * Server Action: Get single product with brand and UOM relations.
 * Protected by user session authentication.
 */
export async function getProductWithRelationsAction(
  id: string
): Promise<{ success: boolean; data: ProductLookupResult | null; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, data: null, error: "Unauthorized. Please log in." };
  }

  try {
    const data = await getProductWithRelations(id);
    return { success: true, data };
  } catch (error) {
    console.error("getProductWithRelationsAction failed:", error);
    return { success: false, data: null, error: "Failed to retrieve product details." };
  }
}

/**
 * Server Action: Search brands for autocomplete.
 * Protected by user session authentication.
 * Pure read-only lookup with zero brand creation.
 */
export async function searchBrandsAction(
  query: string,
  limit = 10
): Promise<{ success: boolean; data: BrandLookupResult[]; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { success: false, data: [], error: "Unauthorized. Please log in." };
  }

  try {
    const data = await searchBrands(query, limit);
    return { success: true, data };
  } catch (error) {
    console.error("searchBrandsAction failed:", error);
    return { success: false, data: [], error: "Failed to search brands." };
  }
}

/**
 * Server Action: Get all active Units of Measure.
 * Protected by user session authentication.
 * Filters strictly to active UOMs for new quotation items.
 */
export async function getActiveUomsAction(): Promise<{
  success: boolean;
  data: UomLookupResult[];
  error?: string;
}> {
  const session = await getSession();
  if (!session) {
    return { success: false, data: [], error: "Unauthorized. Please log in." };
  }

  try {
    const data = await listActiveUoms();
    return { success: true, data };
  } catch (error) {
    console.error("getActiveUomsAction failed:", error);
    return { success: false, data: [], error: "Failed to load units of measure." };
  }
}
