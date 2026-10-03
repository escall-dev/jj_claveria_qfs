/**
 * Component Layer for JJ Claveria QFS.
 *
 * Architecture Guidelines:
 * - Server Components by default for layouts, data presentation, and static shells.
 * - Client Components ('use client') strictly scoped for interactive forms, dynamic rows, autocomplete, and live calculations.
 */

export * from "./catalog";
export * from "./quotations";
