import Link from "next/link";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Welcome back,{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {session?.displayName || "User"}
            </span>{" "}
            <span className="text-xs text-zinc-400">({session?.username || "authenticated"})</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/quotations?new=1"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Quotation</span>
          </Link>

          <form action="/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:border-zinc-800 dark:hover:border-rose-900/50 transition-colors shadow-xs cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/quotations"
          className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg mb-3">
              📄
            </div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Quotations
            </h2>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              View, create, and manage quotation forms and transaction history.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-blue-600 dark:text-blue-400">
            <span>Open Quotations</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>

        <Link
          href="/catalog"
          className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg mb-3">
              📦
            </div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Catalog Hub
            </h2>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              Manage items, brands, and standard commercial units of measure.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span>Manage Catalog</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>

        <Link
          href="/customers"
          className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg mb-3">
              👥
            </div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Customers
            </h2>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              Manage customer records, contact personnel, and shipping addresses.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-purple-600 dark:text-purple-400">
            <span>View Customers</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>

        <Link
          href="/settings"
          className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div>
            <div className="h-9 w-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center text-lg mb-3">
              ⚙️
            </div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
              Settings
            </h2>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              Company defaults, quotation terms, and application preferences.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span>Configure</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
