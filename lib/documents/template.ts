import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  TemplateNotFoundError,
  TemplateIntegrityError,
  TemplateImmutabilityError,
} from "../errors.ts";
import type { TemplateMetadata } from "./types.ts";

/**
 * Canonical JJ Claveria QFS DOCX quotation template constants.
 */
export const CANONICAL_TEMPLATE_RELATIVE_PATH = path.join(
  "quotation_form_template",
  "Formal_Quotation_Template.docx"
);

export const CANONICAL_TEMPLATE_SHA256 =
  "86020610DC7773AB65FA4BD944EE467FB6A789294701BE43B19DCF23493F4CA8";

export const CANONICAL_TEMPLATE_BYTE_SIZE = 37926;

/**
 * Resolves the canonical template file path safely relative to the project root.
 * Traverses upwards if necessary to locate the workspace root in various runtime contexts.
 */
export function getCanonicalTemplatePath(customPath?: string): string {
  if (customPath) {
    const resolved = path.resolve(customPath);
    if (!fs.existsSync(resolved)) {
      throw new TemplateNotFoundError(
        "Custom quotation template path does not exist",
        resolved
      );
    }
    return resolved;
  }

  // Check from process.cwd()
  const cwdCandidate = path.resolve(process.cwd(), CANONICAL_TEMPLATE_RELATIVE_PATH);
  if (fs.existsSync(cwdCandidate)) {
    return cwdCandidate;
  }

  // Fallback traversal for monorepos or test execution contexts
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, CANONICAL_TEMPLATE_RELATIVE_PATH);
    if (fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new TemplateNotFoundError(
    "Canonical quotation template could not be located",
    cwdCandidate
  );
}

/**
 * Computes the SHA-256 hash of a buffer or Uint8Array.
 */
export function computeSha256(data: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(data).digest("hex").toUpperCase();
}

/**
 * Computes the SHA-256 hash of a file on disk.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new TemplateNotFoundError("Cannot hash non-existent file", resolved);
  }
  const content = await fs.promises.readFile(/*turbopackIgnore: true*/ resolved);
  return computeSha256(content);
}

/**
 * Verifies the cryptographic integrity of the canonical quotation template.
 */
export async function verifyTemplateIntegrity(customPath?: string): Promise<{
  valid: boolean;
  actualHash: string;
  expectedHash: string;
}> {
  const templatePath = getCanonicalTemplatePath(customPath);
  const actualHash = await computeFileSha256(templatePath);
  const expectedHash = CANONICAL_TEMPLATE_SHA256;

  return {
    valid: actualHash === expectedHash,
    actualHash,
    expectedHash,
  };
}

/**
 * Safeguard against accidental mutation: asserts that targetPath is NOT the canonical template.
 * Throws TemplateImmutabilityError if targetPath resolves to the canonical template.
 */
export function assertNotCanonicalTemplate(targetPath: string): void {
  try {
    const canonical = path.resolve(/*turbopackIgnore: true*/ getCanonicalTemplatePath()).toLowerCase();
    const target = path.resolve(targetPath).toLowerCase();
    if (canonical === target) {
      throw new TemplateImmutabilityError(
        `Security restriction: Cannot write to canonical template at ${targetPath}`
      );
    }
  } catch (err) {
    if (err instanceof TemplateImmutabilityError) {
      throw err;
    }
    // If canonical template cannot be located, proceed safely
  }
}

/**
 * Safely loads the canonical template into an immutable in-memory Buffer.
 * Default behavior verifies cryptographic integrity before returning.
 */
export async function loadTemplateBuffer(options?: {
  verifyIntegrity?: boolean;
  templatePath?: string;
}): Promise<Buffer> {
  const filePath = getCanonicalTemplatePath(options?.templatePath);
  const buffer = await fs.promises.readFile(/*turbopackIgnore: true*/ filePath);

  if (options?.verifyIntegrity !== false) {
    const actualHash = computeSha256(buffer);
    if (actualHash !== CANONICAL_TEMPLATE_SHA256) {
      throw new TemplateIntegrityError(
        `Quotation template integrity violation. File hash does not match canonical signature.`,
        actualHash,
        CANONICAL_TEMPLATE_SHA256
      );
    }
  }

  return buffer;
}

/**
 * Retrieves high-level metadata about the official template file.
 */
export async function getTemplateMetadata(
  customPath?: string
): Promise<TemplateMetadata> {
  const filePath = getCanonicalTemplatePath(customPath);
  const stats = await fs.promises.stat(/*turbopackIgnore: true*/ filePath);
  const sha256 = await computeFileSha256(filePath);

  return {
    filePath,
    sha256,
    byteSize: stats.size,
    tableCount: 4,
    bodyParagraphCount: 10,
    preallocatedItemRowCount: 6,
  };
}
