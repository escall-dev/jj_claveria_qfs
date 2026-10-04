import Link from "next/link";

export default function QuotationNotFound() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex items-center justify-center">
      <div className="max-w-md w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-xs space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/60 flex items-center justify-center text-red-500">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Quotation Not Found
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The requested quotation could not be found or may have been deleted.
        </p>
        <div className="pt-2">
          <Link
            href="/quotations"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
          >
            Return to Quotation History
          </Link>
        </div>
      </div>
    </main>
  );
}
