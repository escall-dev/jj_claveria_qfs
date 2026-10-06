import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Settings — JJ Claveria QFS",
  description: "Company defaults, quotation terms, and application preferences.",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            System & Application Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Company credentials, standard quotation terms, VAT parameters, and system defaults.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-xl mb-3">
            ⚙️
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Company & System Defaults
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            Default company terms (J.J. Claveria & Industrial Supplies, 12% VAT standard, 30-day payment terms) are configured at the database level. Dedicated settings management UI will expand in subsequent batches.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
