import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { adminRoutes } from "@/config/admin-routes.config";
import { getAdminInquiryPage } from "@/lib/admin-inquiry-queries";
import {
  adminInquirySearchParamsSchema,
  buildAdminInquiriesHref,
} from "@/lib/admin-inquiry-validation";
import { LeadsInbox } from "./_components/leads-inbox";

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const parsed = adminInquirySearchParamsSchema.safeParse(rawSearchParams);
  if (!parsed.success) return <InvalidLeadFilters />;

  const result = await getAdminInquiryPage(rawSearchParams);
  const totalPages = Math.max(1, result.totalPages);
  if (result.page > totalPages) {
    redirect(buildAdminInquiriesHref(result.search, totalPages));
  }

  return (
    <LeadsInbox
      key={`${result.search}:${result.page}`}
      leads={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={totalPages}
      search={result.search}
      selectedInquiry={result.selectedInquiry}
      requestedLeadId={result.requestedLeadId}
    />
  );
}

function InvalidLeadFilters() {
  return (
    <section
      role="alert"
      className="bg-surface grid justify-items-center gap-3 rounded-[var(--radius-sm)] border p-8 text-center"
    >
      <h2 className="text-xl font-extrabold">Invalid lead inbox filters</h2>
      <p className="text-muted-foreground max-w-lg text-sm">
        One or more search parameters are unsupported. Clear the search and try
        again.
      </p>
      <Button asChild variant="outline">
        <Link href={adminRoutes.leads}>Clear filters</Link>
      </Button>
    </section>
  );
}
