"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UOM } from "@/types/catalog";
import { createUomAction, updateUomAction, toggleUomActiveAction } from "./actions";

interface UomsManagerProps {
  initialUoms: UOM[];
  initialSearch?: string;
}

export function UomsManager({ initialUoms, initialSearch = "" }: UomsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAbbreviation, setNewAbbreviation] = useState("");

  // Edit state
  const [editingUom, setEditingUom] = useState<UOM | null>(null);
  const [editName, setEditName] = useState("");
  const [editAbbreviation, setEditAbbreviation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("search", search.trim());
      }
      router.push(`/catalog/uoms?${params.toString()}`);
    });
  };

  const handleResetSearch = () => {
    setSearch("");
    startTransition(() => {
      router.push("/catalog/uoms");
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("name", newName);
    formData.append("abbreviation", newAbbreviation);

    startTransition(async () => {
      const res = await createUomAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to create UOM.");
      } else {
        setSuccessMessage(`Unit of Measure "${newName.trim()}" created successfully.`);
        setNewName("");
        setNewAbbreviation("");
        setIsAddOpen(false);
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUom) return;

    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("id", editingUom.id);
    formData.append("name", editName);
    formData.append("abbreviation", editAbbreviation);

    startTransition(async () => {
      const res = await updateUomAction(null, formData);
      if (!res.success) {
        setError(res.error || "Failed to update UOM.");
      } else {
        setSuccessMessage(`Unit of Measure updated to "${editName.trim()}".`);
        setEditingUom(null);
      }
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean, name: string) => {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await toggleUomActiveAction(id, currentActive);
      if (!res.success) {
        setError(res.error || "Failed to update status.");
      } else {
        const nextState = !currentActive ? "activated" : "deactivated";
        setSuccessMessage(`UOM "${name}" has been ${nextState}.`);
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

      {/* Header controls: Search & New UOM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
          <input
            type="text"
            placeholder="Search units of measure..."
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
            setNewName("");
            setNewAbbreviation("");
            setError(null);
          }}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Add UOM
        </button>
      </div>

      {/* Add UOM Card */}
      {isAddOpen && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Add New Unit of Measure
          </h2>
          <form onSubmit={handleCreate} className="space-y-4 max-w-md">
            <div>
              <label
                htmlFor="new-uom-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Unit Name *
              </label>
              <input
                id="new-uom-name"
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Piece, Box, Set, Meter"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="new-uom-abbr"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Abbreviation (Optional)
              </label>
              <input
                id="new-uom-abbr"
                type="text"
                maxLength={20}
                placeholder="e.g. pc, bx, m, kg"
                value={newAbbreviation}
                onChange={(e) => setNewAbbreviation(e.target.value)}
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
                {isPending ? "Saving..." : "Save UOM"}
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

      {/* Edit UOM Card */}
      {editingUom && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Edit Unit of Measure: {editingUom.name}
          </h2>
          <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
            <div>
              <label
                htmlFor="edit-uom-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Unit Name *
              </label>
              <input
                id="edit-uom-name"
                type="text"
                required
                maxLength={50}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="edit-uom-abbr"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Abbreviation (Optional)
              </label>
              <input
                id="edit-uom-abbr"
                type="text"
                maxLength={20}
                value={editAbbreviation}
                onChange={(e) => setEditAbbreviation(e.target.value)}
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
                {isPending ? "Updating..." : "Update UOM"}
              </button>
              <button
                type="button"
                onClick={() => setEditingUom(null)}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UOMs Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Unit Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Abbreviation
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {initialUoms.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500">
                  {initialSearch
                    ? `No units of measure found matching "${initialSearch}".`
                    : "No units of measure found. Click '+ Add UOM' above to create one."}
                </td>
              </tr>
            ) : (
              initialUoms.map((uom) => (
                <tr key={uom.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {uom.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-500 font-mono">
                    {uom.abbreviation || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        uom.active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      {uom.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUom(uom);
                        setEditName(uom.name);
                        setEditAbbreviation(uom.abbreviation || "");
                        setIsAddOpen(false);
                      }}
                      disabled={isPending}
                      className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(uom.id, uom.active, uom.name)}
                      disabled={isPending}
                      className={`${
                        uom.active
                          ? "text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                          : "text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                      }`}
                    >
                      {uom.active ? "Deactivate" : "Activate"}
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
