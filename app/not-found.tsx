import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Page Not Found
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        The requested resource could not be found.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Return Home
      </Link>
    </div>
  );
}
