"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { saveQuotation } from "@/lib/quotations";
import type { QuotationFormState, SaveQuotationActionResult } from "@/types/quotation";

/**
 * Server Action: Persists a new quotation and its historical snapshot line items.
 *
 * Security & Integrity Guardrails:
 * 1. Requires active authenticated session.
 * 2. Derives created_by strictly from server session, never trusting client input.
 * 3. Authoritative server-side recalculation via Phase 10 engine.
 * 4. Atomic transaction / RPC persistence.
 */
export async function saveQuotationAction(
  formState: QuotationFormState
): Promise<SaveQuotationActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Authentication required. Please log in to save quotations.",
    };
  }

  // Derive created_by strictly from authenticated session
  const sessionUserId = session.userId;

  const result = await saveQuotation(formState, sessionUserId);

  if (result.success) {
    revalidatePath("/quotations");
    if (result.quotationId) {
      revalidatePath(`/quotations/${result.quotationId}`);
    }
  }

  return result;
}
