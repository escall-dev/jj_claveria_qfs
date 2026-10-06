"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const navigationCommands = [
    { label: "Dashboard", href: "/dashboard", section: "Navigation", icon: "📊" },
    { label: "Quotations History", href: "/quotations", section: "Navigation", icon: "📄" },
    { label: "Create New Quotation", href: "/quotations?new=1", section: "Actions", icon: "➕" },
    { label: "Customer Directory", href: "/customers", section: "Navigation", icon: "👥" },
    { label: "Catalog Hub", href: "/catalog", section: "Catalog", icon: "📁" },
    { label: "Products Catalog", href: "/catalog/products", section: "Catalog", icon: "📦" },
    { label: "Brands Management", href: "/catalog/brands", section: "Catalog", icon: "🏷️" },
    { label: "Units of Measure", href: "/catalog/uoms", section: "Catalog", icon: "⚖️" },
    { label: "System Settings", href: "/settings", section: "System", icon: "⚙️" },
  ];

  const filtered = navigationCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  const handleSelect = (href: string) => {
    handleClose();
    router.push(href);
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Navigation"
      description="Jump to any module or execute quotation workflows"
      maxWidth="md"
    >
      <div className="space-y-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to..."
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 pl-9 pr-4 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus-visible:outline-2 focus-visible:outline-blue-600"
          />
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500">
              No matching pages or actions found.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => handleSelect(item.href)}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  {item.section}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
