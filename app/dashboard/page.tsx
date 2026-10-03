import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Welcome back,{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {session?.displayName || "User"}
              </span>{" "}
              ({session?.username || "authenticated"})
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </header>

        {/* Quick Links Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/quotations"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Quotations
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              View, create, and manage quotation forms
            </p>
          </Link>

          <Link
            href="/catalog"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Catalog
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Brands, products, and units of measure
            </p>
          </Link>

          <Link
            href="/customers"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Customers
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Manage client records and directory
            </p>
          </Link>

          <Link
            href="/settings"
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Settings
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Company defaults, tax settings, and system
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
