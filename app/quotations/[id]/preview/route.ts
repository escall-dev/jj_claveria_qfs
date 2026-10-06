import { getSession } from "@/lib/auth";
import { getQuotationById } from "@/lib/quotations";
import { processQuotationPdfPreview } from "@/lib/documents";

export const dynamic = "force-dynamic";

/**
 * Route Handler for previewing an authoritative quotation as an inline official .pdf document.
 * GET /quotations/[id]/preview
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  const quotation = id ? await getQuotationById(id.trim()) : null;

  try {
    const result = await processQuotationPdfPreview(session, quotation, id);
    return new Response(result.body as BodyInit, {
      status: result.status,
      headers: result.headers,
    });
  } catch (err: unknown) {
    console.error("Quotation PDF preview route error:", err);
    return new Response("Failed to generate quotation preview document", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
