"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { CommandPalette } from "./command-palette";

interface AppShellProps {
  user?: {
    displayName?: string;
    username?: string;
  } | null;
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = "jjqfs_sidebar_collapsed";
const sidebarListeners = new Set<() => void>();

function notifySidebarListeners() {
  for (const listener of sidebarListeners) {
    listener();
  }
}

function subscribeSidebar(callback: () => void) {
  sidebarListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    sidebarListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSidebarSnapshot(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerSidebarSnapshot(): boolean {
  return false;
}

const emptySubscribe = () => () => {};

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const storedCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getServerSidebarSnapshot
  );

  const isSidebarCollapsed = isMounted ? storedCollapsed : false;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleToggleSidebar = () => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!isSidebarCollapsed));
    } catch {
      // Storage unavailable
    }
    notifySidebarListeners();
  };

  // Keyboard shortcut listener for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // For unauthenticated login screen or clean pages, bypass the application shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* 1. Desktop Collapsible Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* 2. Main Content Viewport */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Header */}
        <Header
          user={user}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Page Content Body (with bottom padding for mobile navigation bar) */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation (Drawer + Bottom Bar) */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onOpen={() => setIsMobileNavOpen(true)}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
      />

      {/* 4. Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
