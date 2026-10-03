"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20 max-w-md w-full">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">
          Something went wrong!
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          An unexpected error occurred while processing your request.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-zinc-500 font-mono">
            Error digest: {error.digest}
          </p>
        )}
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
