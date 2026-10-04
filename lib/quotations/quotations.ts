import { supabase } from "@/lib/supabase";
import type {
  QuotationFormState,
  QuotationSummary,
  QuotationWithItems,
  SaveQuotationActionResult,
  DatabaseQuotationItem,
} from "@/types/quotation";
import { validateQuotationForm } from "@/lib/validations/quotation";
import { calculateItemTotal, calculateQuotationTotal } from "@/lib/calculations";

/**
 * Server-side Authoritative Quotation Persistence.
 * Validates inputs, computes authoritative calculations, preserves historical snapshots,
 * and executes atomic persistence.
 */
export async function saveQuotation(
  form: QuotationFormState,
  sessionUserId: string
): Promise<SaveQuotationActionResult> {
  // 1. Server-side validation
  const validation = validateQuotationForm(form);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error || "Please correct the highlighted form errors.",
      fieldErrors: validation.fieldErrors,
      itemErrors: validation.itemErrors,
    };
  }

  // 2. Authoritative calculation via Phase 10 Calculation Engine
  const quotationCalc = calculateQuotationTotal(form.items);
  if (!quotationCalc.success) {
    return {
      success: false,
      error: "Calculation engine rejected line item values. Please review item quantities and unit prices.",
    };
  }

  const grandTotal = quotationCalc.totalAmount;
  const qfNumber = form.qfNumber.trim();

  // 3. Prepare immutable historical snapshots for all line items
  const itemSnapshots = form.items.map((item, index) => {
    const itemCalc = calculateItemTotal(item.unitPrice, item.quantity);
    const unitPriceNum = typeof item.unitPrice === "number" ? item.unitPrice : parseFloat(String(item.unitPrice));
    const quantityNum = typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity));

    return {
      product_id: item.productId && item.productId !== "" ? item.productId : null,
      item_number: index + 1,
      item_description: (item.description || "").trim(),
      brand_name: item.brandName && item.brandName.trim() !== "" ? item.brandName.trim() : null,
      uom: (item.uom || "").trim(),
      unit_price: unitPriceNum,
      quantity: quantityNum,
      item_total: itemCalc.success ? itemCalc.itemTotal : 0,
    };
  });

  // 4. Attempt atomic persistence via Supabase RPC (Phase 11 migration function)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("save_quotation_atomic", {
      p_qf_number: qfNumber,
      p_quotation_date: form.date.trim(),
      p_customer_name: form.companyName.trim(),
      p_customer_address: form.companyAddress.trim(),
      p_contact_person: form.contactPerson ? form.contactPerson.trim() : null,
      p_contact_number: form.contactNumber ? form.contactNumber.trim() : null,
      p_total_amount: grandTotal,
      p_created_by: sessionUserId,
      p_customer_id: form.customerId && form.customerId !== "" ? form.customerId : null,
      p_items: itemSnapshots,
    });

    if (!rpcError && rpcData) {
      if (rpcData.success) {
        return {
          success: true,
          quotationId: rpcData.quotation_id,
          qfNumber: rpcData.qf_number || qfNumber,
        };
      } else {
        return {
          success: false,
          error: rpcData.error || "Failed to save quotation.",
        };
      }
    }

    // If RPC failed due to duplicate key or known database message
    if (rpcError && rpcError.code !== "PGRST202") {
      if (rpcError.message.includes("unique") || rpcError.message.includes("already exists")) {
        return {
          success: false,
          error: `QF Number "${qfNumber}" already exists. Please choose a different QF Number.`,
          fieldErrors: { qfNumber: [`QF Number "${qfNumber}" is already in use.`] },
        };
      }
      return {
        success: false,
        error: rpcError.message || "Database error occurred while persisting quotation.",
      };
    }
  } catch (err: unknown) {
    console.error("RPC save_quotation_atomic exception:", err);
  }

  // 5. Fallback persistence (if RPC not yet applied in remote database cache)
  // Verify QF Number uniqueness first
  const { data: existingQf } = await supabase
    .from("quotations")
    .select("id")
    .eq("qf_number", qfNumber)
    .maybeSingle();

  if (existingQf) {
    return {
      success: false,
      error: `QF Number "${qfNumber}" already exists. Please choose a different QF Number.`,
      fieldErrors: { qfNumber: [`QF Number "${qfNumber}" is already in use.`] },
    };
  }

  // Insert quotation header snapshot
  const headerPayload: Record<string, unknown> = {
    qf_number: qfNumber,
    quotation_date: form.date.trim(),
    customer_id: form.customerId && form.customerId !== "" ? form.customerId : null,
    customer_name: form.companyName.trim(),
    customer_address: form.companyAddress.trim(),
    contact_person: form.contactPerson && form.contactPerson.trim() !== "" ? form.contactPerson.trim() : null,
    contact_number: form.contactNumber && form.contactNumber.trim() !== "" ? form.contactNumber.trim() : null,
    total_amount: grandTotal,
    status: "draft",
    created_by: sessionUserId,
  };

  const { data: savedHeader, error: headerError } = await supabase
    .from("quotations")
    .insert(headerPayload)
    .select("id, qf_number")
    .single();

  if (headerError || !savedHeader) {
    if (headerError?.code === "42501" || headerError?.message?.includes("row-level security")) {
      return {
        success: false,
        error: "Supabase RLS prevented direct insert. Please ensure migration 20261004_phase11_quotation_persistence.sql is applied to Supabase.",
      };
    }
    if (headerError?.message?.includes("unique") || headerError?.code === "23505") {
      return {
        success: false,
        error: `QF Number "${qfNumber}" already exists. Please choose a different QF Number.`,
        fieldErrors: { qfNumber: [`QF Number "${qfNumber}" is already in use.`] },
      };
    }
    return {
      success: false,
      error: headerError?.message || "Failed to persist quotation header.",
    };
  }

  const quotationId = savedHeader.id;

  // Insert quotation items snapshots
  const itemsPayload = itemSnapshots.map((item) => ({
    quotation_id: quotationId,
    product_id: item.product_id,
    item_number: item.item_number,
    item_description: item.item_description,
    brand_name: item.brand_name,
    uom: item.uom,
    unit_price: item.unit_price,
    quantity: item.quantity,
    item_total: item.item_total,
  }));

  const { error: itemsError } = await supabase
    .from("quotation_items")
    .insert(itemsPayload);

  if (itemsError) {
    // Rollback quotation header to maintain atomic consistency
    await supabase.from("quotations").delete().eq("id", quotationId);
    return {
      success: false,
      error: `Failed to persist quotation line items: ${itemsError.message}. The transaction was safely rolled back.`,
    };
  }

  return {
    success: true,
    quotationId,
    qfNumber,
  };
}

/**
 * Retrieves the list of quotations for the Quotation History view (/quotations).
 * Returns quotations sorted newest-first by quotation_date and created_at.
 */
export async function listQuotations(): Promise<QuotationSummary[]> {
  // 1. Try RPC get_quotations_list
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_quotations_list");
    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        qf_number: String(row.qf_number),
        quotation_date: String(row.quotation_date),
        customer_name: String(row.customer_name || ""),
        customer_address: String(row.customer_address || ""),
        contact_person: row.contact_person ? String(row.contact_person) : null,
        contact_number: row.contact_number ? String(row.contact_number) : null,
        total_amount: Number(row.total_amount || 0),
        status: String(row.status || "draft"),
        created_by: String(row.created_by || ""),
        created_at: String(row.created_at || ""),
      }));
    }
  } catch (err: unknown) {
    console.error("RPC get_quotations_list error:", err);
  }

  // 2. Fallback to direct query
  const { data, error } = await supabase
    .from("quotations")
    .select(`
      id,
      qf_number,
      quotation_date,
      customer_name,
      customer_address,
      contact_person,
      contact_number,
      total_amount,
      status,
      created_by,
      created_at
    `)
    .order("quotation_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    qf_number: row.qf_number,
    quotation_date: row.quotation_date,
    customer_name: row.customer_name || "Unknown Customer",
    customer_address: row.customer_address || "",
    contact_person: row.contact_person,
    contact_number: row.contact_number,
    total_amount: Number(row.total_amount || 0),
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
  }));
}

/**
 * Retrieves a single quotation with its immutable historical line item snapshots (/quotations/[id]).
 */
export async function getQuotationById(id: string): Promise<QuotationWithItems | null> {
  if (!id || typeof id !== "string") {
    return null;
  }

  // 1. Try RPC get_quotation_detail
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_quotation_detail", {
      p_quotation_id: id,
    });

    if (!rpcError && rpcData && typeof rpcData === "object" && rpcData.id) {
      const q = rpcData as Record<string, unknown>;
      const rawItems = Array.isArray(q.items) ? q.items : [];
      const items: DatabaseQuotationItem[] = rawItems.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        quotation_id: String(item.quotation_id),
        product_id: item.product_id ? String(item.product_id) : null,
        item_number: Number(item.item_number || 1),
        item_description: String(item.item_description || ""),
        brand_name: item.brand_name ? String(item.brand_name) : null,
        uom: String(item.uom || ""),
        unit_price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 0),
        item_total: Number(item.item_total || 0),
        created_at: String(item.created_at || ""),
      }));

      return {
        id: String(q.id),
        qf_number: String(q.qf_number),
        quotation_date: String(q.quotation_date),
        customer_id: q.customer_id ? String(q.customer_id) : null,
        customer_name: String(q.customer_name || ""),
        customer_address: String(q.customer_address || ""),
        contact_person: q.contact_person ? String(q.contact_person) : null,
        contact_number: q.contact_number ? String(q.contact_number) : null,
        total_amount: Number(q.total_amount || 0),
        status: String(q.status || "draft"),
        created_by: String(q.created_by || ""),
        created_at: String(q.created_at || ""),
        updated_at: String(q.updated_at || ""),
        items,
      };
    }
  } catch (err: unknown) {
    console.error("RPC get_quotation_detail error:", err);
  }

  // 2. Fallback to direct queries
  const { data: header, error: headerError } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (headerError || !header) {
    return null;
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", id)
    .order("item_number", { ascending: true });

  if (itemsError) {
    return null;
  }

  const items: DatabaseQuotationItem[] = (itemsData || []).map((item) => ({
    id: item.id,
    quotation_id: item.quotation_id,
    product_id: item.product_id,
    item_number: item.item_number,
    item_description: item.item_description,
    brand_name: item.brand_name,
    uom: item.uom,
    unit_price: Number(item.unit_price || 0),
    quantity: Number(item.quantity || 0),
    item_total: Number(item.item_total || 0),
    created_at: item.created_at,
  }));

  const result: QuotationWithItems = {
    id: header.id,
    qf_number: header.qf_number,
    quotation_date: header.quotation_date,
    customer_id: header.customer_id,
    customer_name: header.customer_name || "Unknown Customer",
    customer_address: header.customer_address || "",
    contact_person: header.contact_person,
    contact_number: header.contact_number,
    total_amount: Number(header.total_amount || 0),
    status: header.status,
    created_by: header.created_by,
    created_at: header.created_at,
    updated_at: header.updated_at,
    items,
  };

  return result;
}
