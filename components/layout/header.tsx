"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Dropdown, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";

interface HeaderProps {
  user?: {
    displayName?: string;
    username?: string;
  } | null;
  onOpenMobileNav: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({
  user,
  onOpenMobileNav,
  onOpenCommandPalette,
}: HeaderProps) {
  const pathname = usePathname();

  // Compute a clean breadcrumb / title based on current path
  const getPageTitle = (path: string) => {
    if (path === "/dashboard") return "Dashboard";
    if (path === "/quotations") return "Quotations";
    if (path === "/quotations/new") return "New Quotation";
    if (path.startsWith("/quotations/")) return "Quotation Detail";
    if (path === "/customers") return "Customers";
    if (path === "/catalog") return "Catalog Hub";
    if (path === "/catalog/products") return "Products Catalog";
    if (path === "/catalog/brands") return "Brands";
    if (path === "/catalog/uoms") return "Units of Measure";
    if (path === "/settings") return "Settings";
    return "Quotation System";
  };

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "US";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 sm:px-6 transition-colors">
      {/* Left: Mobile Toggle & Page Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {getPageTitle(pathname)}
          </span>
        </div>
      </div>

      {/* Center: Command Palette Trigger Placeholder */}
      <div className="hidden sm:flex items-center justify-center flex-1 max-w-md mx-4">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-3.5 py-1.5 text-xs text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search modules, quotations...</span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Theme Toggle, User Profile Menu */}
      <div className="flex items-center gap-2.5">
        {/* Command search icon trigger for small screens */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Search"
          className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              id="user-menu-button"
              aria-label="User profile menu"
              className="flex items-center gap-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 sm:px-2.5 sm:py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer select-none"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                  {user?.displayName || "Operator"}
                </span>
                <span className="text-[10px] text-zinc-400 leading-tight">
                  @{user?.username || "authenticated"}
                </span>
              </div>
              <svg className="hidden sm:block h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          }
        >
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {user?.displayName || "Operator"}
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">
              @{user?.username || "authenticated"}
            </p>
            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60">
              Active Session
            </span>
          </div>

          <DropdownItem as="div">
            <Link href="/settings" className="flex items-center gap-2 w-full">
              <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              <span>Application Settings</span>
            </Link>
          </DropdownItem>

          <DropdownItem as="div">
            <Link href="/quotations" className="flex items-center gap-2 w-full">
              <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Quotation History</span>
            </Link>
          </DropdownItem>

          <DropdownDivider />

          <form action="/logout" method="POST" className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-left cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </form>
        </Dropdown>
      </div>
    </header>
  );
}
