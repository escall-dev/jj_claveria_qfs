import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getQuotationById } from "@/lib/quotations";
import { formatCurrency } from "@/lib/calculations";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quotation = await getQuotationById(id);
  if (!quotation) {
    return { title: "Quotation Not Found — JJ Claveria QFS" };
  }
  return {
    title: `${quotation.qf_number} — Quotation Detail | JJ Claveria QFS`,
  };
}

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();

  // Authentication guard
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const quotation = await getQuotationById(id);

  if (!quotation) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumbs & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/dashboard"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-zinc-400">/</span>
            <Link
              href="/quotations"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Quotations
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {quotation.qf_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/quotations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to History</span>
            </Link>
            <a
              href={`/quotations/${quotation.id}/export`}
              download
              id="export-docx-button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export DOCX</span>
            </a>
            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Quotation</span>
            </Link>
          </div>
        </div>

        {/* Quotation Header Card */}
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                  {quotation.qf_number}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wider">
                  {quotation.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Created on {new Date(quotation.created_at).toLocaleString()} by {quotation.created_by}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-400 block">
                Quotation Date
              </span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                {quotation.quotation_date}
              </span>
            </div>
          </div>

          {/* Customer & Company Details (Historical Snapshot) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Customer & Company Information (Snapshot)
              </h2>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
                Immutable Snapshot
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block">Company Name</span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {quotation.customer_name}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block">Address</span>
                <span className="text-xs text-zinc-800 dark:text-zinc-200">
                  {quotation.customer_address}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block">Contact Person</span>
                <span className="text-xs text-zinc-800 dark:text-zinc-200">
                  {quotation.contact_person || "—"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block">Contact Number</span>
                <span className="text-xs text-zinc-800 dark:text-zinc-200">
                  {quotation.contact_number || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Quotation Line Items Table (Historical Snapshot) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Quotation Line Items ({quotation.items.length})
              </h2>
              <span className="text-[10px] text-zinc-400">
                Authoritative item totals calculated at save
              </span>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-[#2C3E50] text-white text-[11px] font-bold">
                    <th scope="col" className="px-3 py-2 text-center w-12">#</th>
                    <th scope="col" className="px-4 py-2">Item Description</th>
                    <th scope="col" className="px-3 py-2">Brand</th>
                    <th scope="col" className="px-3 py-2">UOM</th>
                    <th scope="col" className="px-3 py-2 text-right">Unit Price</th>
                    <th scope="col" className="px-3 py-2 text-right">Quantity</th>
                    <th scope="col" className="px-4 py-2 text-right">Item Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {quotation.items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-center font-bold text-zinc-400">
                        {item.item_number}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                        {item.item_description}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                        {item.brand_name || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700 dark:text-zinc-300">
                        {item.uom}
                      </td>
                      <td className="px-3 py-2.5 text-right text-zinc-800 dark:text-zinc-200 tabular-nums">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatCurrency(item.item_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Total Row */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 rounded-lg bg-[#F2F4F7] dark:bg-zinc-800/70 border border-[#2C3E50]/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Total Amount:
                </span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatCurrency(quotation.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Document Roadmap Preview Notice */}
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Official DOCX export is active. PDF export and advanced preview workflows will be available in subsequent phases (Phase 15–16).
          </p>
        </div>
      </div>
    </main>
  );
}
