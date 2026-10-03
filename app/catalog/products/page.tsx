import Link from "next/link";
import { listProducts } from "@/lib/catalog/products";
import { listBrands } from "@/lib/catalog/brands";
import { listUoms } from "@/lib/catalog/uoms";
import { ProductsManager } from "./products-manager";

export const metadata = {
  title: "Product Catalog — JJ Claveria QFS",
  description: "Manage products, items, brands, and units of measure for quotation system",
};

interface ProductsPageProps {
  searchParams: Promise<{ search?: string; brandId?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { search, brandId } = await searchParams;

  const [products, brands, uoms] = await Promise.all([
    listProducts({ search, brandId }),
    listBrands(),
    listUoms({ activeOnly: true }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Products</span>
        </div>

        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Product & Item Catalog
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Reusable catalog items referenced when composing quotation forms.
            </p>
          </div>
        </div>

        {/* Interactive Manager */}
        <ProductsManager
          initialProducts={products}
          availableBrands={brands}
          availableUoms={uoms}
          initialSearch={search || ""}
          initialBrandId={brandId || ""}
        />
      </div>
    </div>
  );
}
