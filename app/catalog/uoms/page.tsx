import Link from "next/link";
import { listUoms } from "@/lib/catalog/uoms";
import { UomsManager } from "./uoms-manager";

export const metadata = {
  title: "Unit of Measure Management — JJ Claveria QFS",
  description: "Manage commercial units of measurement for quotation system",
};

interface UomsPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function UomsPage({ searchParams }: UomsPageProps) {
  const { search } = await searchParams;
  const uoms = await listUoms({ search });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/catalog" className="hover:underline">
            Catalog
          </Link>
          <span>/</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            Units of Measure
          </span>
        </div>

        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Units of Measure (UOM)
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Commercial units for quotation items and pricing.
            </p>
          </div>
        </div>

        {/* Interactive Manager */}
        <UomsManager initialUoms={uoms} initialSearch={search || ""} />
      </div>
    </div>
  );
}
