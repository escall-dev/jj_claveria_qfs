import Link from "next/link";

export default function CatalogPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Catalog</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Catalog overview and item management.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/catalog/brands"
          className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-400"
        >
          <h2 className="font-semibold">Brands</h2>
          <p className="text-xs text-zinc-500">Manage catalog brands</p>
        </Link>
        <Link
          href="/catalog/products"
          className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-400"
        >
          <h2 className="font-semibold">Products</h2>
          <p className="text-xs text-zinc-500">Manage product items</p>
        </Link>
        <Link
          href="/catalog/uoms"
          className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-400"
        >
          <h2 className="font-semibold">Units of Measure</h2>
          <p className="text-xs text-zinc-500">Manage UOM entries</p>
        </Link>
      </div>
    </div>
  );
}
