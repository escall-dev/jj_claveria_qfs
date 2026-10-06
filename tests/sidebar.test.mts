import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("1. Sidebar component layout & styling invariants", () => {
  const sidebarPath = path.resolve(process.cwd(), "components/layout/sidebar.tsx");
  assert.ok(fs.existsSync(sidebarPath), "sidebar.tsx must exist");
  const content = fs.readFileSync(sidebarPath, "utf-8");

  // Fixed collapsed width constraints & overflow prevention
  assert.ok(
    content.includes('w-20 min-w-20 max-w-20'),
    "Collapsed sidebar must have explicit fixed width constraints (w-20 min-w-20 max-w-20)"
  );
  assert.ok(
    content.includes("overflow-x-hidden"),
    "Sidebar and nav container must have overflow-x-hidden to prevent horizontal page/sidebar scrolling"
  );

  // Accessible navigation link naming
  assert.ok(
    content.includes("aria-label={item.name}"),
    "Navigation links must have aria-label={item.name} for screen reader accessibility"
  );
  assert.ok(
    content.includes('isCollapsed ? "sr-only" : "truncate"'),
    "Navigation labels must use sr-only when collapsed to avoid occupying layout width while retaining accessible name"
  );

  // Icon centering
  assert.ok(
    content.includes('isCollapsed ? "justify-center w-full" : "gap-3"'),
    "Collapsed navigation items must be horizontally centered (justify-center w-full)"
  );
});

test("2. Tooltip component overlay portal & accessibility invariants", () => {
  const tooltipPath = path.resolve(process.cwd(), "components/ui/tooltip.tsx");
  assert.ok(fs.existsSync(tooltipPath), "tooltip.tsx must exist");
  const content = fs.readFileSync(tooltipPath, "utf-8");

  // React Portal to document.body
  assert.ok(
    content.includes("createPortal"),
    "Tooltip must render via createPortal to isolate overlay from sidebar layout flow"
  );
  assert.ok(
    content.includes("document.body"),
    "Tooltip portal target must be document.body"
  );

  // Fixed overlay positioning
  assert.ok(
    content.includes('position: "fixed"'),
    "Tooltip must use position: fixed to prevent expanding container scrollWidth or causing horizontal scrolling"
  );

  // Right offset ensuring placement outside the 80px sidebar
  assert.ok(
    content.includes("Math.max(rect.right + 10, 88)"),
    "Tooltip right position must guarantee placement outside the collapsed sidebar (>80px)"
  );

  // Keyboard accessibility
  assert.ok(
    content.includes("onFocusCapture") || content.includes("onFocus"),
    "Tooltip must support keyboard focus events"
  );
  assert.ok(
    content.includes("onBlurCapture") || content.includes("onBlur"),
    "Tooltip must dismiss on blur"
  );
  assert.ok(
    content.includes('role="tooltip"'),
    "Tooltip element must have role='tooltip'"
  );
});

test("3. Navigation items completeness & labeling", () => {
  const sidebarPath = path.resolve(process.cwd(), "components/layout/sidebar.tsx");
  const content = fs.readFileSync(sidebarPath, "utf-8");

  const expectedSections = [
    "Dashboard",
    "Quotations",
    "Customers",
    "Products",
    "Brands",
    "Units of Measure",
    "Settings",
    "Sign Out",
    "Expand Sidebar",
  ];

  for (const name of expectedSections) {
    assert.ok(
      content.includes(`"${name}"`),
      `Sidebar must define navigation item or action for "${name}"`
    );
  }
});
