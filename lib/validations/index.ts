/**
 * Shared Validation Strategy Boundary for JJ Claveria QFS.
 *
 * Architecture:
 * 1. Client UX Validation: Rapid form feedback before submitting.
 * 2. Server Authoritative Validation: Strict validation in Server Actions / API routes before database entry.
 * 3. Database Constraints: Foreign keys, nullability, checks, and RLS policies in PostgreSQL.
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface Validator<TInput, TOutput = TInput> {
  validate(input: TInput): ValidationResult<TOutput>;
}

export * from "./catalog";
export * from "./quotation";
