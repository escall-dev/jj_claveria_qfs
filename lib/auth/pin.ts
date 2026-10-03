import crypto from "node:crypto";
import { AUTH_CONFIG } from "./config";

/**
 * Validates that an entered PIN conforms to the QFS numeric length rules.
 * Never throws error messages containing the actual PIN value.
 */
export function isValidPinFormat(pin: unknown): pin is string {
  if (typeof pin !== "string") {
    return false;
  }
  return AUTH_CONFIG.PIN_REGEX.test(pin);
}

/**
 * Hashes a numeric PIN using Node.js scrypt with a cryptographically secure random salt.
 * Output format: `scrypt:<salt-hex>:<derivedKey-hex>`
 * Never store PIN in plaintext.
 */
export function hashPin(pin: string): string {
  if (!isValidPinFormat(pin)) {
    throw new Error(`PIN must be exactly ${AUTH_CONFIG.PIN_LENGTH} numeric digits`);
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verifies an entered PIN against a stored scrypt hash using constant-time comparison.
 * Prevents timing attacks and credential leakage.
 */
export function verifyPin(enteredPin: string, storedHash: string): boolean {
  if (!isValidPinFormat(enteredPin)) {
    return false;
  }

  try {
    const parts = storedHash.split(":");
    if (parts.length !== 3 || parts[0] !== "scrypt") {
      return false;
    }

    const [, salt, expectedHashHex] = parts;
    const expectedBuffer = Buffer.from(expectedHashHex, "hex");
    const actualBuffer = crypto.scryptSync(enteredPin, salt, expectedBuffer.length);

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}
