/**
 * Application Error Hierarchy for JJ Claveria Quotation Form System (QFS).
 * Provides consistent error classifications across client, server, database, and document generation.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "INTERNAL_ERROR", statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class DocumentItemCountError extends ValidationError {
  constructor(message: string) {
    super(message);
    this.name = "DocumentItemCountError";
  }
}

export class DatabaseError extends AppError {
  public readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message, "DATABASE_ERROR", 500);
    this.name = "DatabaseError";
    this.originalError = originalError;
  }
}

export class DocumentGenerationError extends AppError {
  public readonly format: "docx" | "pdf";

  constructor(message: string, format: "docx" | "pdf") {
    super(message, "DOCUMENT_GENERATION_ERROR", 500);
    this.name = "DocumentGenerationError";
    this.format = format;
  }
}

export class TemplateNotFoundError extends AppError {
  public readonly path?: string;

  constructor(message = "Quotation DOCX template file not found", path?: string) {
    super(path ? `${message}: ${path}` : message, "TEMPLATE_NOT_FOUND", 404);
    this.name = "TemplateNotFoundError";
    this.path = path;
  }
}

export class TemplateIntegrityError extends AppError {
  public readonly actualHash: string;
  public readonly expectedHash: string;

  constructor(message: string, actualHash: string, expectedHash: string) {
    super(message, "TEMPLATE_INTEGRITY_MISMATCH", 500);
    this.name = "TemplateIntegrityError";
    this.actualHash = actualHash;
    this.expectedHash = expectedHash;
  }
}

export class TemplateImmutabilityError extends AppError {
  constructor(message = "Refusing to overwrite canonical quotation template") {
    super(message, "TEMPLATE_IMMUTABILITY_VIOLATION", 403);
    this.name = "TemplateImmutabilityError";
  }
}

export class DocumentStructureError extends AppError {
  constructor(message: string) {
    super(message, "DOCUMENT_STRUCTURE_INVALID", 500);
    this.name = "DocumentStructureError";
  }
}

