"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Brand } from "@/types/catalog";
import { createBrandAction, updateBrandAction, deleteBrandAction } from "./actions";

interface BrandsManagerProps {
  initialBrands: Brand[];
  initialSearch?: string;
}

export function BrandsManager({ initialBrands, initialSearch = "" }: BrandsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Form states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editBrandName, setEditBrandName] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }
      router.push(`/catalog/brands?${params.toString()}`);
    });
  };

  const handleResetSearch = () => {
    setSearch("");
    startTransition(() => {
      router.push("/catalog/brands");
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("name", newBrandName);

    startTransition(async () => {
      const res = await createBrandAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to create brand.");
      } else {
        setSuccessMessage(`Brand "${newBrandName.trim()}" created successfully.`);
        setNewBrandName("");
        setIsAddOpen(false);
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;

    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("id", editingBrand.id);
    formData.append("name", editBrandName);

    startTransition(async () => {
      const res = await updateBrandAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to update brand.");
      } else {
        setSuccessMessage(`Brand updated to "${editBrandName.trim()}".`);
        setEditingBrand(null);
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete brand "${name}"?`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setDeletingId(id);

    startTransition(async () => {
      const res = await deleteBrandAction(id);
      setDeletingId(null);
      if (!res.success) {
        setError(res.error || "Failed to delete brand.");
      } else {
        setSuccessMessage(`Brand "${name}" was deleted successfully.`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Action / Alert Messages */}
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

      {/* Header controls: Search & New Brand */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
          <input
            type="text"
            placeholder="Search brands by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Search
          </button>
          {initialSearch && (
            <button
              type="button"
              onClick={handleResetSearch}
              disabled={isPending}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              Clear
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setIsAddOpen(true);
            setNewBrandName("");
            setError(null);
          }}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Add Brand
        </button>
      </div>

      {/* Add Brand Inline / Modal Card */}
      {isAddOpen && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Add New Brand
          </h2>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <label
                htmlFor="new-brand-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Brand Name *
              </label>
              <input
                id="new-brand-name"
                type="text"
                required
                maxLength={100}
                placeholder="e.g. PaperOne, Pilot, Canon"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !newBrandName.trim()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {isPending ? "Saving..." : "Save Brand"}
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

      {/* Edit Brand Modal Card */}
      {editingBrand && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Edit Brand: {editingBrand.name}
          </h2>
          <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
            <div>
              <label
                htmlFor="edit-brand-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Brand Name *
              </label>
              <input
                id="edit-brand-name"
                type="text"
                required
                maxLength={100}
                value={editBrandName}
                onChange={(e) => setEditBrandName(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !editBrandName.trim()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {isPending ? "Updating..." : "Update Brand"}
              </button>
              <button
                type="button"
                onClick={() => setEditingBrand(null)}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Brands Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Brand Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {initialBrands.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-zinc-500">
                  {initialSearch
                    ? `No brands found matching "${initialSearch}".`
                    : "No brands registered in catalog yet. Click '+ Add Brand' above to register one."}
                </td>
              </tr>
            ) : (
              initialBrands.map((brand) => (
                <tr key={brand.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {brand.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-500">
                    {brand.created_at ? new Date(brand.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrand(brand);
                        setEditBrandName(brand.name);
                        setIsAddOpen(false);
                      }}
                      disabled={isPending}
                      className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(brand.id, brand.name)}
                      disabled={isPending || deletingId === brand.id}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === brand.id ? "Deleting..." : "Delete"}
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
