import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const metadata = {
  title: "Catalog Hub — JJ Claveria QFS",
  description: "Manage products, brands, and units of measurement for quotations",
};

export default async function CatalogPage() {
  const [{ count: productsCount }, { count: brandsCount }, { count: uomsCount }] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("brands").select("id", { count: "exact", head: true }),
      supabase.from("uoms").select("id", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Catalog</span>
        </div>

        {/* Page Title Header */}
        <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Catalog Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Maintain master records for products, manufacturer brands, and commercial units of measure.
          </p>
        </div>

        {/* Catalog Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/catalog/products"
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Catalog
                </span>
                <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  {productsCount ?? 0} items
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                Products
              </h2>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Manage reusable catalog items with assigned brands, descriptions, and default selling units.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline">
              Open Products Catalog →
            </div>
          </Link>

          <Link
            href="/catalog/brands"
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Catalog
                </span>
                <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  {brandsCount ?? 0} brands
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                Brands
              </h2>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Register manufacturer and supplier brands to categorize products and quotation line items.
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline">
              Manage Brands →
            </div>
          </Link>

          <Link
            href="/catalog/uoms"
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Catalog
                </span>
                <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  {uomsCount ?? 0} UOMs
                </span>
              </div>
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                Units of Measure
              </h2>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Maintain standard commercial packaging and selling units (Piece, Box, Liter, Roll, etc.).
              </p>
            </div>
            <div className="mt-6 flex items-center text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline">
              Manage Units of Measure →
            </div>
          </Link>
        </div>
      </div>
  );
}
