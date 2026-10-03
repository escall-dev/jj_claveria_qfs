/**
 * Central Authentication Configuration for JJ Claveria QFS.
 * Centralizes PIN rules, session parameters, and rate-limiting limits.
 */

export const AUTH_CONFIG = {
  // PIN Configuration
  PIN_LENGTH: 6,
  PIN_REGEX: /^\d{6}$/,

  // Session Configuration
  SESSION_COOKIE_NAME: "qfs_session",
  SESSION_MAX_AGE_SECONDS: 60 * 60 * 8, // 8 hours session duration

  // Brute-force & Lockout Protection
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes lockout

  // Protected route paths
  PROTECTED_ROUTES: [
    "/dashboard",
    "/quotations",
    "/customers",
    "/catalog",
    "/settings",
  ],
} as const;
