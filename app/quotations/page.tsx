import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listQuotations } from "@/lib/quotations";
import { formatCurrency } from "@/lib/calculations";

export const metadata = {
  title: "Quotation History — JJ Claveria QFS",
  description: "View and manage saved quotations and historical transaction records.",
};

export default async function QuotationsPage() {
  const session = await getSession();

  // Authentication guard
  if (!session) {
    redirect("/login");
  }

  // Fetch quotations ordered newest first (using historical snapshots)
  const quotations = await listQuotations();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Quotations
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            Quotation History
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Historical quotation records preserved with immutable customer and item snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/quotations/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Quotation</span>
          </Link>
        </div>
      </div>

      {/* Quotations Content */}
      {quotations.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No quotations created yet
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Create your first formal quotation to generate historical customer snapshots and record transaction lines.
          </p>
          <div className="mt-5">
            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Quotation</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th scope="col" className="px-4 py-3">QF #</th>
                  <th scope="col" className="px-4 py-3">Quotation Date</th>
                  <th scope="col" className="px-4 py-3">Customer / Company</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Total Amount</th>
                  <th scope="col" className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {quotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {q.qf_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {q.quotation_date}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-800 dark:text-zinc-200">
                      <div className="font-medium">{q.customer_name}</div>
                      {q.customer_address && (
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate max-w-xs">
                          {q.customer_address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wide">
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatCurrency(q.total_amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title={`View ${q.qf_number}`}
                        aria-label={`View ${q.qf_number}`}
                      >
                        <span>View Details</span>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View */}
          <div className="block md:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {quotations.map((q) => (
              <div key={q.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/quotations/${q.id}`}
                      className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {q.qf_number}
                    </Link>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                      {q.customer_name}
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase tracking-wide">
                    {q.status}
                  </span>
                </div>

                {q.customer_address && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {q.customer_address}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                  <div className="text-zinc-500 dark:text-zinc-400">
                    {q.quotation_date}
                  </div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(q.total_amount)}
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href={`/quotations/${q.id}`}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
                  >
                    <span>View Details</span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
            <span>Total Quotations: {quotations.length}</span>
            <span className="text-[11px]">Sorted newest first</span>
          </div>
        </div>
      )}
    </div>
  );
}
