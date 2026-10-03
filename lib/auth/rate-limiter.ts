import { AUTH_CONFIG } from "./config";

interface AttemptRecord {
  count: number;
  lastAttemptAt: number;
  lockedUntil?: number;
}

// In-memory rate limiting store with interface boundary for future database persistence
const attemptsStore = new Map<string, AttemptRecord>();

export interface RateLimitCheckResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutRemainingMinutes?: number;
}

export class RateLimiter {
  /**
   * Checks if an account identifier is currently locked out.
   */
  static check(identifier: string): RateLimitCheckResult {
    const key = identifier.toLowerCase().trim();
    const record = attemptsStore.get(key);
    const now = Date.now();

    if (!record) {
      return {
        allowed: true,
        remainingAttempts: AUTH_CONFIG.MAX_FAILED_ATTEMPTS,
      };
    }

    // Check if lockout is active
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutRemainingMinutes: remainingMinutes,
      };
    }

    // If lockout window passed, reset lockout
    if (record.lockedUntil && record.lockedUntil <= now) {
      attemptsStore.delete(key);
      return {
        allowed: true,
        remainingAttempts: AUTH_CONFIG.MAX_FAILED_ATTEMPTS,
      };
    }

    const remaining = Math.max(0, AUTH_CONFIG.MAX_FAILED_ATTEMPTS - record.count);
    return {
      allowed: true,
      remainingAttempts: remaining,
    };
  }

  /**
   * Records a failed login attempt and locks account if threshold exceeded.
   */
  static recordFailedAttempt(identifier: string): { locked: boolean; remainingAttempts: number } {
    const key = identifier.toLowerCase().trim();
    const now = Date.now();
    const record = attemptsStore.get(key) || { count: 0, lastAttemptAt: now };

    record.count += 1;
    record.lastAttemptAt = now;

    if (record.count >= AUTH_CONFIG.MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + AUTH_CONFIG.LOCKOUT_DURATION_MS;
      attemptsStore.set(key, record);
      return { locked: true, remainingAttempts: 0 };
    }

    attemptsStore.set(key, record);
    return {
      locked: false,
      remainingAttempts: AUTH_CONFIG.MAX_FAILED_ATTEMPTS - record.count,
    };
  }

  /**
   * Resets failed attempt counter upon successful authentication.
   */
  static reset(identifier: string): void {
    const key = identifier.toLowerCase().trim();
    attemptsStore.delete(key);
  }
}
