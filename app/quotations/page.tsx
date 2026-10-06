import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listQuotations } from "@/lib/quotations";
import { listActiveUoms } from "@/lib/catalog/uoms";
import { QuotationsView } from "@/components/quotations";

export const metadata = {
  title: "Quotation History — JJ Claveria QFS",
  description: "View and manage saved quotations and historical transaction records.",
};

export default async function QuotationsPage() {
  const session = await getSession();

  // Authentication guard
  if (!session) {
    redirect("/login");
  }

  // Fetch quotations and active UOMs in parallel
  const [quotations, activeUoms] = await Promise.all([
    listQuotations(),
    listActiveUoms(),
  ]);

  return (
    <QuotationsView
      initialQuotations={quotations}
      initialUoms={activeUoms}
      currentUser={{
        displayName: session.displayName,
        username: session.username,
      }}
    />
  );
}
