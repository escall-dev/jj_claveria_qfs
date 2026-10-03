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
