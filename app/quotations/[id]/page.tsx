export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Quotation #{id}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Quotation details and preview (placeholder).
      </p>
    </div>
  );
}
