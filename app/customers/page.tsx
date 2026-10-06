import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Customers Directory — JJ Claveria QFS",
  description: "Manage client records, directory, and contact information.",
};

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Customers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            Customer Directory
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Maintain client accounts, authorized signatories, and delivery addresses.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xl mb-3">
            👥
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Customer Directory Management
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
            Customer records are currently snapshot-preserved during quotation creation. Full standalone directory management will be introduced in subsequent batches.
          </p>
          <div className="mt-5">
            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs"
            >
              <span>Create New Quotation</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
