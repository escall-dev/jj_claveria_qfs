"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProductWithRelations, Brand, UOM } from "@/types/catalog";
import { createProductAction, updateProductAction, deleteProductAction } from "./actions";

interface ProductsManagerProps {
  initialProducts: ProductWithRelations[];
  availableBrands: Brand[];
  availableUoms: UOM[];
  initialSearch?: string;
  initialBrandId?: string;
}

export function ProductsManager({
  initialProducts,
  availableBrands,
  availableUoms,
  initialSearch = "",
  initialBrandId = "",
}: ProductsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [brandFilter, setBrandFilter] = useState(initialBrandId);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add product state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBrandId, setNewBrandId] = useState("");
  const [newUomId, setNewUomId] = useState("");

  // Edit product state
  const [editingProduct, setEditingProduct] = useState<ProductWithRelations | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBrandId, setEditBrandId] = useState("");
  const [editUomId, setEditUomId] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const applyFilters = (newSearch: string, newBrand: string) => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (newSearch.trim()) {
        params.set("search", newSearch.trim());
      }
      if (newBrand) {
        params.set("brandId", newBrand);
      }
      router.push(`/catalog/products?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(search, brandFilter);
  };

  const handleBrandFilterChange = (newBrand: string) => {
    setBrandFilter(newBrand);
    applyFilters(search, newBrand);
  };

  const handleResetFilters = () => {
    setSearch("");
    setBrandFilter("");
    startTransition(() => {
      router.push("/catalog/products");
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("name", newName);
    formData.append("description", newDescription);
    formData.append("brand_id", newBrandId);
    formData.append("default_uom_id", newUomId);

    startTransition(async () => {
      const res = await createProductAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to create product.");
      } else {
        setSuccessMessage(`Product "${newName.trim()}" created successfully.`);
        setNewName("");
        setNewDescription("");
        setNewBrandId("");
        setNewUomId("");
        setIsAddOpen(false);
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("id", editingProduct.id);
    formData.append("name", editName);
    formData.append("description", editDescription);
    formData.append("brand_id", editBrandId);
    formData.append("default_uom_id", editUomId);

    startTransition(async () => {
      const res = await updateProductAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to update product.");
      } else {
        setSuccessMessage(`Product "${editName.trim()}" updated successfully.`);
        setEditingProduct(null);
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setDeletingId(id);

    startTransition(async () => {
      const res = await deleteProductAction(id);
      setDeletingId(null);
      if (!res.success) {
        setError(res.error || "Failed to delete product.");
      } else {
        setSuccessMessage(`Product "${name}" was deleted successfully.`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 flex justify-between items-center"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400 flex justify-between items-center"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header controls: Search, Filter, New Product */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2 max-w-2xl w-full">
          <input
            type="text"
            placeholder="Search products by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <select
            value={brandFilter}
            onChange={(e) => handleBrandFilterChange(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">All Brands</option>
            {availableBrands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Filter
          </button>

          {(initialSearch || initialBrandId) && (
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={isPending}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              Reset
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setIsAddOpen(true);
            setNewName("");
            setNewDescription("");
            setNewBrandId("");
            setNewUomId("");
            setError(null);
          }}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Add Product
        </button>
      </div>

      {/* Add Product Card */}
      {isAddOpen && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Add New Catalog Product
          </h2>
          <form onSubmit={handleCreate} className="space-y-4 max-w-xl">
            <div>
              <label
                htmlFor="new-prod-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Product Name *
              </label>
              <input
                id="new-prod-name"
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Bond Paper A4, Ballpen Black, Hydraulic Oil"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-prod-brand"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Brand (Optional)
                </label>
                <select
                  id="new-prod-brand"
                  value={newBrandId}
                  onChange={(e) => setNewBrandId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">— No Brand / Generic —</option>
                  {availableBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="new-prod-uom"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Default UOM (Optional)
                </label>
                <select
                  id="new-prod-uom"
                  value={newUomId}
                  onChange={(e) => setNewUomId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">— No Default UOM —</option>
                  {availableUoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.abbreviation ? `(${u.abbreviation})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-prod-desc"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Description / Specifications (Optional)
              </label>
              <textarea
                id="new-prod-desc"
                rows={2}
                placeholder="Optional details, sizes, specs..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !newName.trim()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {isPending ? "Saving..." : "Save Product"}
              </button>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Product Card */}
      {editingProduct && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Edit Product: {editingProduct.name}
          </h2>
          <form onSubmit={handleUpdate} className="space-y-4 max-w-xl">
            <div>
              <label
                htmlFor="edit-prod-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Product Name *
              </label>
              <input
                id="edit-prod-name"
                type="text"
                required
                maxLength={200}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="edit-prod-brand"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Brand (Optional)
                </label>
                <select
                  id="edit-prod-brand"
                  value={editBrandId}
                  onChange={(e) => setEditBrandId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">— No Brand / Generic —</option>
                  {availableBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-prod-uom"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Default UOM (Optional)
                </label>
                <select
                  id="edit-prod-uom"
                  value={editUomId}
                  onChange={(e) => setEditUomId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="">— No Default UOM —</option>
                  {availableUoms.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.abbreviation ? `(${u.abbreviation})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-prod-desc"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Description / Specifications (Optional)
              </label>
              <textarea
                id="edit-prod-desc"
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !editName.trim()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {isPending ? "Updating..." : "Update Product"}
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Default UOM
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {initialProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-zinc-500">
                  {initialSearch || initialBrandId
                    ? "No products found matching the search/filter criteria."
                    : "No products in catalog yet. Click '+ Add Product' above to create one."}
                </td>
              </tr>
            ) : (
              initialProducts.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-300">
                    {product.brand ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {product.brand.name}
                      </span>
                    ) : (
                      <span className="text-zinc-400 italic">Generic</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-300">
                    {product.default_uom ? (
                      <span className="font-mono">
                        {product.default_uom.name}{" "}
                        {product.default_uom.abbreviation
                          ? `(${product.default_uom.abbreviation})`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-zinc-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 max-w-xs truncate">
                    {product.description || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(product);
                        setEditName(product.name);
                        setEditDescription(product.description || "");
                        setEditBrandId(product.brand_id || "");
                        setEditUomId(product.default_uom_id || "");
                        setIsAddOpen(false);
                      }}
                      disabled={isPending}
                      className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={isPending || deletingId === product.id}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === product.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
