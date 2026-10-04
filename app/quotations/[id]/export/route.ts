import { getSession } from "@/lib/auth";
import { getQuotationById } from "@/lib/quotations";
import { processQuotationExport } from "@/lib/documents";

export const dynamic = "force-dynamic";

/**
 * Route Handler for exporting an authoritative quotation as a completed official .docx file.
 * GET /quotations/[id]/export
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await getSession();
  const quotation = id ? await getQuotationById(id.trim()) : null;

  try {
    const result = await processQuotationExport(session, quotation, id);
    return new Response(result.body as BodyInit, {
      status: result.status,
      headers: result.headers,
    });
  } catch (err: unknown) {
    console.error("Quotation DOCX export route error:", err);
    return new Response("Failed to generate quotation document", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
