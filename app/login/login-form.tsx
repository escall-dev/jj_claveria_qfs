"use client";

import { useActionState, useState } from "react";
import { loginAction } from "./actions";

interface LoginFormProps {
  availableAccounts: Array<{ username: string; displayName: string }>;
}

export function LoginForm({ availableAccounts }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const hasAccounts = availableAccounts.length > 0;
  const [selectedUsername, setSelectedUsername] = useState(
    availableAccounts[0]?.username || ""
  );
  const [customUsername, setCustomUsername] = useState("");
  const [isCustom, setIsCustom] = useState(!hasAccounts);
  const [pin, setPin] = useState("");

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept numeric input up to 6 digits
    const numericValue = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(numericValue);
  };

  const usernameToSubmit = isCustom ? customUsername : selectedUsername;

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          {state.error}
        </div>
      )}

      {/* Account Selection / Entry */}
      <div>
        <label
          htmlFor="account-select"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Account
        </label>
        {!isCustom ? (
          <div className="space-y-2">
            <select
              id="account-select"
              name="username"
              value={selectedUsername}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setIsCustom(true);
                } else {
                  setSelectedUsername(e.target.value);
                }
              }}
              disabled={isPending}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            >
              {availableAccounts.map((account) => (
                <option key={account.username} value={account.username}>
                  {account.displayName} ({account.username})
                </option>
              ))}
              <option value="__custom__">+ Enter custom account...</option>
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                id="custom-username-input"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter account identifier"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                disabled={isPending}
                required
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
              />
              {hasAccounts && (
                <button
                  type="button"
                  onClick={() => setIsCustom(false)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Select
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Masked PIN Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="pin-input"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            PIN
          </label>
          <span className="text-xs text-zinc-500">6 digits</span>
        </div>
        <input
          id="pin-input"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="current-password"
          placeholder="••••••"
          value={pin}
          onChange={handlePinChange}
          disabled={isPending}
          required
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-center text-lg tracking-[0.5em] font-mono shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending || !usernameToSubmit || pin.length < 6}
        className="w-full rounded-md bg-zinc-900 py-2.5 px-4 text-sm font-medium text-white shadow hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
      >
        {isPending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
