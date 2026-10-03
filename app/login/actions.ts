"use server";

import { redirect } from "next/navigation";
import {
  AccountRepository,
  createSession,
  destroySession,
  isValidPinFormat,
  RateLimiter,
  verifyPin,
} from "@/lib/auth";

export interface LoginActionResult {
  success: boolean;
  error?: string;
}

const GENERIC_AUTH_ERROR = "Invalid account or PIN.";

export async function loginAction(
  _prevState: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  const username = formData.get("username")?.toString()?.trim() || "";
  const pin = formData.get("pin")?.toString()?.trim() || "";

  if (!username) {
    return { success: false, error: "Please select or enter an account." };
  }

  if (!pin) {
    return { success: false, error: "Please enter your PIN." };
  }

  // Enforce PIN format rules before checking credentials
  if (!isValidPinFormat(pin)) {
    return { success: false, error: GENERIC_AUTH_ERROR };
  }

  // Check brute force protection / lockout
  const rateLimitStatus = RateLimiter.check(username);
  if (!rateLimitStatus.allowed) {
    return {
      success: false,
      error: `Too many failed attempts. Account locked for ${rateLimitStatus.lockoutRemainingMinutes} more minute(s).`,
    };
  }

  // Attempt to locate account
  const account = await AccountRepository.findActiveByUsername(username);

  // Constant-time check: if account not found, still perform a dummy hash verify to prevent timing leakage
  if (!account) {
    RateLimiter.recordFailedAttempt(username);
    return { success: false, error: GENERIC_AUTH_ERROR };
  }

  // Verify PIN against stored scrypt hash
  const isValid = verifyPin(pin, account.pinHash);

  if (!isValid) {
    const attemptResult = RateLimiter.recordFailedAttempt(username);
    if (attemptResult.locked) {
      return {
        success: false,
        error: "Too many failed attempts. Account temporarily locked. Please try again later.",
      };
    }
    return { success: false, error: GENERIC_AUTH_ERROR };
  }

  // Success: reset failed attempts
  RateLimiter.reset(username);

  // Create secure server-side HttpOnly session cookie
  await createSession(account);

  // Redirect to dashboard
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
