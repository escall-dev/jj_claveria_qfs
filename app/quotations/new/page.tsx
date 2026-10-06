import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listActiveUoms } from "@/lib/catalog/uoms";
import { QuotationForm } from "@/components/quotations";

export const metadata = {
  title: "New Quotation — JJ Claveria QFS",
  description: "Compose quotation form with customer details, dynamic line items, and catalog autocomplete.",
};

export default async function NewQuotationPage() {
  const session = await getSession();

  // Route protection: redirect to login if unauthenticated
  if (!session) {
    redirect("/login");
  }

  // Pre-fetch active Units of Measure (read-only query)
  const activeUoms = await listActiveUoms();

  return (
    <div className="w-full mx-auto flex-1 flex flex-col min-h-0">
      <QuotationForm
        initialUoms={activeUoms}
        currentUser={{
          displayName: session.displayName,
          username: session.username,
        }}
      />
    </div>
  );
}
