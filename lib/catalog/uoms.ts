import { supabase } from "@/lib/supabase";
import type {
  UOM,
  UomLookupResult,
  CreateUomInput,
  UpdateUomInput,
} from "@/types/catalog";
import { validateUomInput } from "@/lib/validations/catalog";

/**
 * Lists all active Units of Measure for new quotation items.
 * Strictly filters out inactive records to prevent selection of obsolete units.
 */
export async function listActiveUoms(): Promise<UomLookupResult[]> {
  const { data, error } = await supabase
    .from("uoms")
    .select("id, name, abbreviation, active")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error listing active UOMs:", error);
    return [];
  }

  return (data || []).map((u) => ({
    id: u.id,
    name: u.name,
    abbreviation: u.abbreviation ?? null,
    active: Boolean(u.active),
  }));
}

export async function listUoms(options?: {
  search?: string;
  activeOnly?: boolean;
}): Promise<UOM[]> {
  let query = supabase.from("uoms").select("*").order("name", { ascending: true });

  if (options?.activeOnly) {
    query = query.eq("active", true);
  }

  if (options?.search && options.search.trim()) {
    query = query.ilike("name", `%${options.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching UOMs:", error);
    return [];
  }

  return data as UOM[];
}

export async function getUomById(id: string): Promise<UOM | null> {
  const { data, error } = await supabase.from("uoms").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    return null;
  }
  return data as UOM;
}

export async function createUom(
  input: CreateUomInput
): Promise<{ success: boolean; data?: UOM; error?: string }> {
  const validation = validateUomInput(input.name, input.abbreviation);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error };
  }

  const { name, abbreviation } = validation.data;

  // Case-insensitive duplicate check
  const { data: existing } = await supabase
    .from("uoms")
    .select("id, name")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Unit of Measure "${name}" already exists.` };
  }

  const { data, error } = await supabase
    .from("uoms")
    .insert({
      name,
      abbreviation,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || "Failed to create UOM." };
  }

  return { success: true, data: data as UOM };
}

export async function updateUom(
  id: string,
  input: UpdateUomInput
): Promise<{ success: boolean; data?: UOM; error?: string }> {
  const validation = validateUomInput(input.name, input.abbreviation);
  if (!validation.success || !validation.data) {
    return { success: false, error: validation.error };
  }

  const { name, abbreviation } = validation.data;

  // Case-insensitive duplicate check excluding self
  const { data: existing } = await supabase
    .from("uoms")
    .select("id, name")
    .ilike("name", name)
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `Another Unit of Measure named "${name}" already exists.` };
  }

  const updatePayload: Record<string, unknown> = {
    name,
    abbreviation,
  };

  if (typeof input.active === "boolean") {
    updatePayload.active = input.active;
  }

  const { data, error } = await supabase
    .from("uoms")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || "Failed to update UOM." };
  }

  return { success: true, data: data as UOM };
}

export async function setUomActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; data?: UOM; error?: string }> {
  const { data, error } = await supabase
    .from("uoms")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || "Failed to change UOM status." };
  }

  return { success: true, data: data as UOM };
}
