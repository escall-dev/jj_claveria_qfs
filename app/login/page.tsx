import { redirect } from "next/navigation";
import { AccountRepository, getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login — JJ Claveria QFS",
  description: "PIN-only authentication for JJ Claveria Quotation Form System",
};

export default async function LoginPage() {
  // If already authenticated, redirect to dashboard
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  const availableAccounts = await AccountRepository.listActiveAccounts();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm space-y-8 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            JJ CLAVERIA QFS
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Quotation Form System
          </p>
        </div>

        <LoginForm availableAccounts={availableAccounts} />

        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 text-center">
          <p className="text-xs text-zinc-400">
            Authorized Personnel Only • PIN Protected
          </p>
        </div>
      </div>
    </div>
  );
}
