/**
 * Catalog Domain Types for JJ Claveria QFS.
 * Corresponds to Phase 6 database schema: brands, uoms, products.
 */

export interface Brand {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UOM {
  id: string;
  name: string;
  abbreviation: string | null;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  brand_id: string | null;
  name: string;
  description: string | null;
  default_uom_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  brand?: Brand | null;
  default_uom?: UOM | null;
}

export interface CreateBrandInput {
  name: string;
}

export interface UpdateBrandInput {
  name: string;
}

export interface CreateUomInput {
  name: string;
  abbreviation?: string | null;
}

export interface UpdateUomInput {
  name: string;
  abbreviation?: string | null;
  active?: boolean;
}

export interface CreateProductInput {
  name: string;
  description?: string | null;
  brand_id?: string | null;
  default_uom_id?: string | null;
}

export interface UpdateProductInput {
  name: string;
  description?: string | null;
  brand_id?: string | null;
  default_uom_id?: string | null;
}

/**
 * Lightweight lookup result types for autocomplete and select components.
 * Strictly read-only projections matching Phase 8 requirements.
 */

export interface BrandLookupResult {
  id: string;
  name: string;
}

export interface UomLookupResult {
  id: string;
  name: string;
  abbreviation: string | null;
  active: boolean;
}

export interface ProductLookupResult {
  id: string;
  name: string;
  description: string | null;
  brand_id: string | null;
  default_uom_id: string | null;
  brand: BrandLookupResult | null;
  default_uom: UomLookupResult | null;
}
